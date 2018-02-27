const tp = require('tedious-promises');
const TYPES = require('tedious').TYPES;
const DB = require('./app_config.json').patentDB;
const { connectDocker } = require('./connectDocker');

let patentID = [];

const connectDB = () => connectDocker(DB.connection)
  .then(connectParams => {
    console.log('connecting to sql server %s and database %s', connectParams.server, connectParams.options.database);
    tp.setConnectionConfig(connectParams);
    return Promise.resolve('ok');
  })
  .catch(err => Promise.reject(err))


/** insertNewPatents executes the queryType then
 * returns the PatentID associated with that PatentURI
 * 
 * @param {string} qryType = "u_INSERT" 
 * @param {string} values =VALUES (PatentUri, PMCRef, Title, ClaimsCount, PatentNumber, IndependentClaimsCount, Number, IsInIPR, TechnologySpaceID, TechnologySubSpaceID, CoreSubjectMatterID, PatentPath)
 * @param {*} PatentUri the PatentUri that is being inserted
 * @returns {PatentUri:String, PatentID:Number} the patentID of the newly inserted patent. Useful for inserting claims next
 */
const insertNewPatents = (qryType, values, PatentUri) => {
  return tp.sql(`${DB[qryType]}${values}`)
    .execute()
    .then(() => {
      return tp.sql(`SELECT PatentID FROM Patent WHERE Patent.PatentUri LIKE '${PatentUri}'`)
        .execute()
        .then(result => Promise.resolve({ PatentUri, PatentID: result[0].PatentID }))
        .fail(err => Promise.reject(err))
    })
    .fail(err => Promise.reject(err));
}

/** updatePatents takes a single field, value, and PatentUri and updates it
 * @param {string} field 
 * @param {string} value 
 * @param {string} PatentUri
 * @returns {promise} resolves to the PatentID associated with that PatentURI 
 */
const updatePatents = (field, value, PatentUri) => {
  return tp.sql(`UPDATE Patent SET ${field}='${value}' WHERE Patent.PatentUri LIKE '${PatentUri}'`)
    .execute()
    .then(() => {
      return tp.sql(`SELECT PatentID FROM Patent WHERE Patent.PatentUri LIKE '${PatentUri}'`)
        .execute()
        .then(result => Promise.resolve({ PatentUri, PatentID: result[0].PatentID }))
        .fail(err => Promise.reject(err))
    })
    .fail(err => Promise.reject(err));
}

/** Inserts Claims associated with a PatentID
 * @param {number} PatentID the patentID to associate with the claims
 * @param {Object} claim a single claim entry. Usually an array
 * @returns {string} OK if successful
 */
const insertClaims = (PatentID, claim) => {
  return tp.sql(`INSERT INTO Claim (ClaimNumber, ClaimHtml, IsMethodClaim, PatentID, IsDocumented, IsIndependentClaim) VALUES (${claim.ClaimNumber}, '${claim.ClaimHTML}', ${claim.IsMethodClaim ? 1 : 0}, ${PatentID}, ${claim.IsDocumented ? 1 : 0}, ${claim.IsIndependentClaim ? 1 : 0})`)
    .execute()
    .then(() => {
      return tp.sql(`SELECT ClaimID FROM Claim WHERE Claim.PatentID LIKE '${PatentID}' AND Claim.ClaimNumber LIKE '${claim.ClaimNumber}'`)
        .execute()
        .then(result => Promise.resolve({ PatentID, ClaimNumber: claim.ClaimNumber, ClaimID: result[0].ClaimID }))
        .fail(err => Promise.reject(err))
    })
    .fail(err => Promise.reject(err))
}

module.exports = { insertNewPatents, insertClaims, updatePatents, connectDB };