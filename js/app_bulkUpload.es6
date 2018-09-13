const { Connection, Request, TYPES } = require('tedious');

const MAX_CHARS_TO_SHOW = 10;

/** @private mapType conditions a value for insertion into a SQL query 
 * @param {*} value -> the value to coerce
 * @returns {*} a properly formatted value
*/
const mapType = value => {
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
  return { keyList, paramList: keyList.map(key => ({ name: key, type: mapType(record[key]), val: record[key] })) }
};


/** @private queryNoPromises runs a generic query and returns rows
 * @param {Object} connectInfo -> the tedious connection object
 * @param {string} sqlString -> the fully composed SQL query
 * @param {Array<{name:string, type:TYPE, val:*}} -> an array of parameters corresponding to sql @variables
 * @returns {Promise->Array[results]}
 */
const queryNoPromises = (connectInfo, sqlString, values = []) => {
  let returnResults = [];
  const connectParams = { ...connectInfo };
  return new Promise((resolve, reject) => {
    //console.log('connecting to ', connectParams.options.database);
    if (connection) connection.close();
    if (!connectParams.server) reject('server not yet available');
    const connection = new Connection(connectParams);
    // listener for connect
    connection.on('connect', err => {
      if (err) {
        connection.close();
        return reject(err)
      };
      // console.log('good connection, creating request %s', sqlString);
      const request = new Request(sqlString, (err2, rowCount) => {
        if (err2) {
          connection.close();
          return reject(err2)
        };
        connection.close();
        return resolve(returnResults);
      });
      // listener for rows returned
      request.on('row', data => {
        returnResults.push(data.map(item => item.value))
        return;
      });
      // add parameters one by one to the request
      const expandVals = values.length > 0 ? values.map(item => {
        request.addParameter(item.name, item.type, item.val);
        return { name: item.name, type: item.type.type, val: item.val };
      }) : false;
      // run it !
      // console.log('with parameters: ', expandVals && expandVals.map(item => `${item.name}: ${item.val.length > MAX_CHARS_TO_SHOW ? `${item.val.slice(0, MAX_CHARS_TO_SHOW - 1)}...` : item.val}`));
      connection.execSql(request);
    });
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
      patent = await queryNoPromises(connectParams, testSQL);
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
    const testSQL = `SELECT ClaimID FROM dbo.Claim WHERE ${keyList.map(key => `Claim.${key} LIKE @${key}`).join(' AND ')}`;
    let result = await queryNoPromises(connectParams, testSQL, paramList);
    const ClaimID = result && result[0] && result[0][0];
    if (!ClaimID) {
      // the ClaimID doesn't exist, so insert a new claim
      const insertSQL = `INSERT INTO dbo.Claim (${keyList.join(', ')}) VALUES (${keyList.map(key => `@${key}`).join(', ')})`;
      await queryNoPromises(connectParams, insertSQL, paramList);
      result = await queryNoPromises(connectParams, testSQL, paramList);
      if (!(result && result[0] && result[0][0])) return reject('can\'t find the record we just added!');
    }
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
      paramList[1]
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
 * @param {String} table -> name of table, eg Claim
 * @param {Object} record -> JSON formatted object {column: value} to be written 
 * @param {String} idField -> The name of the ID field associated with the table, eg. ClaimID
 */
const insertAndGetID = (connectParams, table, record, idField, readOnly = false) => new Promise(async (resolve, reject) => {
  try {
    const { keyList, paramList } = getParams(record);
    const checkSQL = `SELECT ${idField} FROM dbo.${table} WHERE ${keyList.map(key => `${table}.${key} LIKE @${key}`).join(' AND ')}`;
    let result = await queryNoPromises(connectParams, checkSQL, paramList);
    let recordID = result && result[0] && result[0][0];
    let type = 'existing';
    if (!recordID && !readOnly) {
      //There's no existing record, and we're not in readOnly mode
      //So insert and return the newest
      const insertSQL = `INSERT INTO dbo.${table} (${keyList.join(', ')}) VALUES (${keyList.map(key => `@${key}`).join(', ')})`;
      await queryNoPromises(connectParams, insertSQL, paramList);
      result = await queryNoPromises(connectParams, checkSQL, paramList);
      recordID = result && result[0] && result[0][0];
      type = 'new'
      // in write mode, not finding the record after writing it should throw an error
      if (!recordID) return reject('no matching record found');
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
    ['MarkmanTerms', 'Client', 'Sector'].map(table => queryNoPromises(connectParams, `SELECT * FROM ${table}`))
  )
    .then(([claimTerms, clients, sectors]) => resolve({
      claimTerms: new Map(claimTerms.map(([ID, term]) => [term, ID])),
      clients: new Map(clients.map(([ID, client, ...rest]) => [client, ID])),
      sectors: new Map(sectors.map(([ID, sect]) => [sect, ID]))
    }))
    .catch(err => reject(err))
});

const getClaimDropdown = (connectParams, PatentID) => new Promise((resolve, reject) => {
  const { paramList } = getParams({ PatentID });
  return queryNoPromises(
    connectParams,
    `SELECT claims.ClaimNumber, claims.ClaimID FROM Claim claims INNER JOIN Patent AS patents ON patents.PatentID=claims.PatentID WHERE claims.PatentID=@PatentID`,
    paramList)
    .then(result => resolve({ claims: new Map(result) }))
    .catch(err => reject(err));
});




module.exports = {
  insertNewPatents,
  insertClaims,
  updatePatents,
  getMarkmanDropdowns,
  insertAndGetID,
  getClaimDropdown
};