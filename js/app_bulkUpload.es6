const { Connection, Request, TYPES } = require('tedious');
const { parseOutput } = require('./app_sqlParse');

const MAX_CHARS_TO_SHOW = 10;
const CHECK=true;

/** @private mapType conditions a value for insertion into a SQL query 
 * @param {*} value -> the value to coerce
 * @returns {*} a properly formatted value
*/
const mapType = value => {
  if (value instanceof Date) return TYPES.DateTime2;
  if (typeof value === 'boolean') return TYPES.Bit;
  if (typeof value === 'number') return TYPES.Numeric;
  return TYPES.NVarChar;
}

/**
 * @private a little helper that generates a list of params
 * @param {Array<String>} keyList -> List of keys that will go into the parameter 
 * @param {Object} record -> Object of {column:value} 
 */
const getParams = (record, skipKeys = []) => {
  const keyList = Object.keys(record).filter(item => !skipKeys.includes(item));
  // remember to escape [  by using [[]
  return { keyList, paramList: keyList.map(name => {
    const type = mapType(record[name]);
    const val = record[name];
    return { name, type, val }
  }) }
};


/** @private queryNoPromises runs a generic query and returns rows
 * @param {Object} connectInfo -> the tedious connection object
 * @param {string} sqlString -> the fully composed SQL query
 * @param {Array<{name:string, type:TYPE, val:*}} -> an array of parameters corresponding to sql @variables
 * @returns {Promise->Array[results]}
 */
const queryNoPromises = (connectInfo, sqlString, values = [], isCheck=false) => {
  let returnResults = [];
  const connectParams = { ...connectInfo };
  return new Promise((resolve, reject) => {
    //console.log('connecting to ', connectParams.options.database);
    // not working if (typeof connection !== 'undefined') connection.close();
    if (!connectParams.server) reject('server not yet available');
    const connection = new Connection(connectParams);
    // listener for connect
    connection.on('connect', err => {
      if (err) {
        console.log('connect error', err);
        connection.close();
        return reject(err)
      };
      // console.log('good connection, creating request %s', sqlString);
      const request = new Request(sqlString, (err2, rowCount) => {
        if (err2) {
          console.log('request error for query %s', sqlString);
          console.log('parameter dump', request.parametersByName);
          connection.close();
          return reject(err2)
        };
        //connection.close();
        return resolve(returnResults);
      });
      // listener for rows returned
      request.on('row', data => {
        returnResults.push(data.map(item => item.value))
        return;
      });
      request.on('error', err3 => {
        console.log('request event error', err3)
        return reject(err3)
      });
      // add parameters one by one to the request
      const expandVals = values.length > 0 ? values.map(item => {
        const cleanValue = (isCheck && item.type.name.includes('Char')) ? item.val.replace(/\[/g, '[[]') : item.val;
        request.addParameter(item.name, item.type, cleanValue);
        return { name: item.name, type: item.type.type, val: cleanValue };
      }) : false;
      // run it !
      //console.log('with parameters: ', expandVals && expandVals.map(item => `${item.name}: ${item.val.length > MAX_CHARS_TO_SHOW ? `${item.val.slice(0, MAX_CHARS_TO_SHOW - 1)}...` : item.val}`));
      connection.execSql(request);
    });
    connection.on('error', err => {
      return reject(err);
    })
  });
}


/** insertNewPatents executes the queryType then
 * returns the PatentID associated with that PatentURI
 * 
 * @param {Object} connectParams = tedious connection parameters 
 * @param {Object} patentRecord = a single JSON-formatted Patent Record
 * @returns {Claims:Array<Claim Records>, PatentID:Number} the claims and patentID of the newly inserted patent. To be passed to the claim insertion step
 */
const insertNewPatents = (connectParams, patentRecord, reportStatus) => new Promise(async (resolve, reject) => {
  try {
    // filter out the claims, we'll deal with those once we have a patentID
    // also filter out downloadLink, we don't put that into the DB
    const { keyList, paramList } = getParams(patentRecord, ['Claims', 'downloadLink']);
    // if already present, skip the insertion
    const testSQL = `SELECT PatentID FROM Patent WHERE Patent.PatentUri LIKE '${patentRecord.PatentUri}'`;
    let patent = await queryNoPromises(connectParams, testSQL);
    let PatentID = patent && patent[0] && patent[0][0];
    if (!PatentID) {
      // if we're still here, the patent needs to be inserted
      const insertSQL = `INSERT INTO Patent (${keyList.join(', ')}) VALUES (${keyList.map(key => `@${key}`).join(', ')})`;
      await queryNoPromises(connectParams, insertSQL, paramList);
      patent = await queryNoPromises(connectParams, testSQL, [], CHECK);
      // returns exactly one match
      PatentID = patent && patent[0] && patent[0][0];
    }
    reportStatus();
    // update the PatentID in each claim entry and return
    return resolve({ Claims: patentRecord.Claims.map(claim => ({ ...claim, PatentID })) })
  } catch (err) {
    return reject(err)
  };
});

/** Inserts Claims associated with a PatentID
 * @param {Object} claim a single claim entry.
 * @returns {Promise -> Object} an Array of {PatentID, ClaimNumber, ClaimID} for confirmation
 */
const insertClaims = (connectParams, claim) => new Promise(async (resolve, reject) => {
  try {
    const { keyList, paramList } = getParams(claim);
    // const testSQL = `SELECT ClaimID FROM dbo.Claim WHERE ${keyList.map(key => `Claim.${key} LIKE @${key}`).join(' AND ')}`;
    // really just check for duplicates of this patent & this claim number
    const testSQL = `SELECT ClaimID FROM dbo.Claim WHERE Claim.PatentID=${claim.PatentID} AND Claim.ClaimNumber=${claim.ClaimNumber}`;
    let result = await queryNoPromises(connectParams, testSQL, paramList.filter(param => param.name === 'PatentID' || param.name === 'ClaimNumber'), CHECK);
    const ClaimID = result && result[0] && result[0][0];
    // if claim exists, update, otherwise, insert
    const insertSQL = ClaimID ?
      `UPDATE Claim SET (${keylist.map(key => `${key}=@${key}`).join(', ')}) WHERE Claim.ClaimID=${ClaimID}` :
      `INSERT INTO dbo.Claim (${keyList.join(', ')}) VALUES (${keyList.map(key => `@${key}`).join(', ')})`;
    await queryNoPromises(connectParams, insertSQL, paramList);
    result = await queryNoPromises(connectParams, testSQL, paramList, CHECK);
    if (!(result && result[0] && result[0][0])) return reject('can\'t find the record we just added!');
    return resolve({ PatentID: claim.PatentID, ClaimNumber: claim.ClaimNumber })
  } catch (err) {
    return reject(err)
  }
});

/** updatePatents takes a single field, value, and PatentUri and updates it
 * @param {string} field 
 * @param {string} value 
 * @param {string} PatentUri
 * @returns {promise} resolves to the PatentID associated with that PatentURI 
 */
const updatePatents = (connectParams, field, value, PatentUri) => new Promise(async (resolve, reject) => {
  try {
    const queryString = `UPDATE Patent SET ${field}=@${field} WHERE Patent.PatentUri LIKE @PatentUri`;
    const { paramList } = getParams({ [field]: value, PatentUri });
    await queryNoPromises(connectParams, queryString, queryValues);
    const result = await queryNoPromises(
      connectParams,
      `SELECT PatentID FROM Patent WHERE Patent.PatentUri LIKE @PatentUri`,
      paramList[1],
      CHECK
    )
    const PatentID = result[0].PatentID;
    return resolve({ PatentUri, PatentID })
  } catch (err) {
    return reject(err)
  }
});

/**
 * 
 * @param {Object} connectParams -> connection parameters object
 * @param {string} table -> name of table, eg Claim
 * @param {Object} record -> JSON formatted object {column: value} to be written 
 * @param {string} idField -> The name of the ID field associated with the table, eg. ClaimID
 * @param {Object} [options] -> A list of options
 * @param {boolean} [options.readOnly=false] -> If true, don't write or update the database, only check and return an idField if present
 * @param {string[]} [options.skipCheck=[]] -> List of columns to **not** use in the DB 'SELECT' query
 * @param {string[]} [options.skipWrite=[]] -> List of columns to **not** use in the DB 'INSERT' query. Ignored if options.readOnly: true or options.updateFields is set
 * @param {string[]} [options.updateFields=[]] -> List of columns to update with an 'UPDATE' query. Ignored if options.readOnly:true. 
 * @returns {(string|Object)} -> 'not found' if data doesn't exist in DB, otherwise {[idField]:value, type:'new' or 'existing'}
 */
const insertAndGetID = (connectParams, table, record, idField, options = {}) => new Promise(async (resolve, reject) => {
  try {
    const controlOptions = {
      skipCheck: options.skipCheck || [],
      skipWrite: (!options.readOnly && !options.updateFields && options.skipWrite) || [],
      readOnly: options.readOnly || false,
      updateFields: (!options.readOnly && options.updateFields) || [],
    }
    // first query to see if the record exists
    let { keyList, paramList } = getParams(record, controlOptions.skipCheck);
    const checkSQL = `SELECT ${idField} FROM dbo.${table} WHERE ${keyList.map(key => `${table}.${key} LIKE @${key}`).join(' AND ')}`;
    let result = await queryNoPromises(connectParams, checkSQL, paramList, CHECK);
    let recordID = result && result[0] && result[0][0];
    let type = 'existing';
    // for testing, stub out the part about writing new or updating records
    if (process.env.DBMODE === 'readonly') {
      if (recordID && controlOptions.updateFields.length) {
        console.log('Caught UPDATE call with DB in Readonly  (DEV) Mode');
        // it is found, and we're in update mode
        // this time the fields to include are listed, so only exclude non-matching fields and the idField
        const skipFields = Object.keys(record).filter(param => !controlOptions.updateFields.includes(param));
        ({ keyList, paramList } = getParams(record, skipFields));
        const updateSQL = `UPDATE dbo.${table} SET ${keyList.map(key => `${key}=@${key}`).join(', ')} WHERE ${idField}=${recordID}`;
        type = 'updated';
        console.log(updateSQL)
      } else if (!recordID && !controlOptions.readOnly) {
        console.log('Caught INSERT call with DB in Readonly Mode');
        //There's no existing record, and we're not in readOnly mode
        ({ keyList, paramList } = getParams(record, controlOptions.skipWrite));
        //So insert and return the newest
        const insertSQL = `INSERT INTO dbo.${table} (${keyList.join(', ')}) VALUES (${keyList.map(key => `@${key}`).join(', ')})`;
        recordID = 999999999;
        type = 'new';
        console.log(insertSQL);
      }
    } else {
      if (recordID && controlOptions.updateFields.length) {
        // it is found, and we're in update mode
        // this time the fields to include are listed, so only exclude non-matching fields and the idField
        const skipFields = Object.keys(record).filter(param => !controlOptions.updateFields.includes(param));
        ({ keyList, paramList } = getParams(record, skipFields));
        const updateSQL = `UPDATE dbo.${table} SET ${keyList.map(key => `${key}=@${key}`).join(', ')} WHERE ${idField}=${recordID}`;
        await queryNoPromises(connectParams, updateSQL, paramList);
        type = 'updated';
      } else if (!recordID && !controlOptions.readOnly) {
        //There's no existing record, and we're not in readOnly mode
        ({ keyList, paramList } = getParams(record, controlOptions.skipWrite));
        //So insert and return the newest
        const insertSQL = `INSERT INTO dbo.${table} (${keyList.join(', ')}) VALUES (${keyList.map(key => `@${key}`).join(', ')})`;
        await queryNoPromises(connectParams, insertSQL, paramList);
        result = await queryNoPromises(connectParams, checkSQL, paramList, CHECK);
        recordID = result && result[0] && result[0][0];
        type = 'new'
        // in write mode, not finding the record after writing it should throw an error
        if (!recordID) return reject('no matching record found');
      }
    }
    // in readOnly mode, not finding the record should resolve with a not found
    return resolve(!recordID ? 'not found' : { [idField]: recordID, type });
  } catch (err) {
    return reject(err);
  }
})

const getMarkmanDropdowns = connectParams => new Promise((resolve, reject) => {
  // returns an object with three properties:
  // claimTerms -- A map of term: termID
  // clients -- A map of client: clientID
  // sectors -- A map of sectors: sectorID
  return Promise.all(
    ['MarkmanTerms', 'Client', 'Sector', 'Patent'].map(table => queryNoPromises(connectParams, `SELECT * FROM ${table}${table === 'Client' ? ' ORDER BY ClientName ASC' : ''}`))
  )
    .then(([claimTerms, clients, sectors, patents]) => resolve({
      claimTerms: new Map(claimTerms.map(([ID, term]) => [term, ID])),
      clients: new Map(clients.map(([ID, client, ...rest]) => [client, ID])),
      sectors: new Map(sectors.map(([ID, sect]) => [sect, ID])),
      patents: new Map(patents.map(([ID, uri, ref, title, html, count, patent]) => [patent, ID]))
    }))
    .catch(err => reject(err))
});

const getPatentFromDigits = (connectParams, digits) => new Promise((resolve, reject) => {
  return queryNoPromises(
    connectParams,
    `SELECT Patent.PatentNumber, Patent.PatentID FROM Patent WHERE CAST(Patent.PatentNumber AS char(7)) LIKE @digits`,
    [{ name: 'digits', type: TYPES.NVarChar, val: `%${digits}%` }]
  )
    .then(patentList => resolve(new Map(patentList)))
    .catch(err => reject(err))
})

const getClaimDropdown = (connectParams, PatentID) => new Promise((resolve, reject) => {
  const { paramList } = getParams({ PatentID });
  return queryNoPromises(
    connectParams,
    `SELECT claims.ClaimNumber, claims.ClaimID FROM Claim claims INNER JOIN Patent AS patents ON patents.PatentID=claims.PatentID WHERE claims.PatentID=@PatentID`,
    paramList)
    .then(result => resolve(new Map(result)))
    .catch(err => reject(err));
});

const getTermConstructions = (connectParams, queryRecord) => new Promise((resolve, reject) => {
  const { keyList, paramList } = getParams(queryRecord, queryRecord.DocumentID ? ['DocumentID'] : []);
  return queryNoPromises(connectParams,
    `SELECT * FROM dbo.MarkmanTermConstruction AS mtc WHERE ${keyList.map(key => `mtc.${key}=@${key}`).join(' AND ')} FOR JSON AUTO`,
    paramList)
    .then(result => {
      if (!result.length) return resolve(new Map());
      const output = [parseOutput('simple', result).map(entry => {
        const { TermConstructionID, ...rest } = entry;
        return [rest, TermConstructionID]
      })];
      return resolve(new Map(output[0]));
    })
    .catch(err => reject(err))
})

const getConstructions = (connectParams, queryRecord) => new Promise((resolve, reject) => {
  // return a table of constructions given either 
  // 1) no query
  // 2) a documentID
  const { keyList, paramList } = getParams(queryRecord, ['TermID', 'ClientID']);
  const hasQuery = queryRecord.DocumentID ? `WHERE ${keyList.map(key => `mc.${key}=@${key}`).join(' AND ')}` : '';
  return queryNoPromises(connectParams,
    `SELECT mc.* FROM dbo.MarkmanConstructions AS mc ${hasQuery} FOR JSON AUTO`,
    hasQuery !== '' ? paramList : [])
    .then(result => {
      if (!result.length) return resolve(new Map());
      const output = [parseOutput('simple', result).map(entry => {
        const { ConstructID, ...rest } = entry;
        // Send with the key as a flat string, not an Object !
        return [Object.keys(rest).map(key => rest[key]).join(':'), ConstructID];
      })];
      return resolve(new Map(output[0]))
    })
    .catch(err => reject(err))
})



module.exports = {
  insertNewPatents,
  insertClaims,
  updatePatents,
  getMarkmanDropdowns,
  insertAndGetID,
  getClaimDropdown,
  getPatentFromDigits,
  getTermConstructions,
  getConstructions
};