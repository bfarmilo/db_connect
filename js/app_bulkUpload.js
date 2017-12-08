const tp = require('tedious-promises');
const TYPES = require('tedious').TYPES;
const DB = require('./app_config.json').patentDB;

const connectParams = Object.assign(DB.connection);

connectParams.server = process.env.SQLIP.split('\'')[1];
if (process.env.USEDB) connectParams.options.database = process.env.USEDB;
console.log('connecting to sql server %s and database %s', connectParams.server, connectParams.options.database);
tp.setConnectionConfig(connectParams);
let patentID = [];

// the main query code
/**
 * 
 * @param {string} qryType = "u_INSERT" 
 * @param {string} values =VALUES (PatentUri, PMCRef, Title, ClaimsCount, PatentNumber, IndependentClaimsCount, Number, IsInIPR, TechnologySpaceID, TechnologySubSpaceID, CoreSubjectMatterID, PatentPath)
 * @param {*} callback 
 */
const insertNewPatents = (qryType, values, PatentUri) => {
  return tp.sql(`${DB[qryType]}${values}`)
    .execute()
    .then(() => {
      return tp.sql(`SELECT PatentID FROM Patent WHERE Patent.PatentUri LIKE '${PatentUri}'`)
        .execute()
        .then(result => Promise.resolve({PatentUri, PatentID:result[0].PatentID}))
        .fail(err => Promise.reject(err))
    })
    .fail(err => Promise.reject(err));
}

const insertClaims = (PatentID, claim) => {
  return tp.sql(`INSERT INTO Claim (ClaimNumber, ClaimHtml, IsMethodClaim, PatentID, IsDocumented ) VALUES (${claim.ClaimNumber}, '${claim.ClaimHTML}', ${claim.IsMethodClaim}, ${PatentID}, ${claim.IsDocumented})`)
  .execute()
  .then(() => Promise.resolve('OK'))
  .fail(err => Promise.reject(err))
}

module.exports = { insertNewPatents, insertClaims };