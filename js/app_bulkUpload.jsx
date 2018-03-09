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
    const paramList = Object.keys(patentRecord).filter(key => key !== 'Claims' && key !== 'downloadLink');
    const queryString = `INSERT INTO Patent (${paramList.join(', ')}) VALUES (${paramList.map(key => `@${key}`).join(', ')})`;
    const queryValues = paramList.map(key => ({ name: key, type: mapType(patentRecord[key]), val: patentRecord[key] }));
    await queryNoPromises(connectParams, queryString, queryValues);
    const patent = await queryNoPromises(connectParams, `SELECT PatentID FROM Patent WHERE Patent.PatentUri LIKE '${patentRecord.PatentUri}'`);
    const PatentID = patent[0][0];
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
    const keyList = Object.keys(claim);
    const queryString = `INSERT INTO dbo.Claim (${keyList.join(', ')}) VALUES (${keyList.map(key => `@${key}`).join(', ')})`;
    const queryValues = keyList.map(key => ({ name: key, type: mapType(claim[key]), val: claim[key] }));
    await queryNoPromises(connectParams, queryString, queryValues);
    const result = await queryNoPromises(
      connectParams,
      `SELECT ClaimID FROM dbo.Claim WHERE Claim.PatentID LIKE '${claim.PatentID}' AND Claim.ClaimNumber LIKE '${claim.ClaimNumber}'`
    );
    const ClaimID = result[0][0];
    return resolve({ PatentID:claim.PatentID, ClaimNumber: claim.ClaimNumber })
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
    const queryString = `UPDATE Patent SET ${field}=@${field} WHERE Patent.PatentUri LIKE '${PatentUri}'`;
    const queryValues = [field].map(key => ({ name: key, type: mapType(value), val: value }));
    await queryNoPromises(connectParams, queryString, queryValues);
    const result = await queryNoPromises(
      connectParams,
      `SELECT PatentID FROM Patent WHERE Patent.PatentUri LIKE '${PatentUri}'`
    )
    const PatentID = result[0].PatentID;
    return resolve({ PatentUri, PatentID })
  } catch (err) {
    return reject(err)
  }
});


module.exports = { insertNewPatents, insertClaims, updatePatents };