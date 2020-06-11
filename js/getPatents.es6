import fetch from 'electron-fetch';
import fse from 'fs-extra';
import { insertNewPatents, insertClaims, updatePatents } from './app_bulkUpload';
import { flatten } from './app_sqlParse';

/**downloadPatents takes an array of url's and downloads them SLICE_SIZE at a time
 * @param {Array<Object>} recordList array of records from the google query in Main
 * @param {string} dropBoxPath
 * @returns {void}
 */

const downloadPatents = async (recordList, dropBoxPath, update) => {

  // convert the incoming record file into an array of {patentNumber, downloadLink, PatentPath}
  const patentList = recordList.map(x => ({ patentNumber: x.PatentNumber, downloadLink: x.downloadLink, PatentPath: x.PatentPath }));

  return Promise.all(patentList.map(async patent => {
    try {
      const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:77.0) Gecko/20100101 Firefox/77.0" };
      return await (await fetch(patent.downloadLink, { headers })).body
        .pipe(fse.createWriteStream(`${dropBoxPath}${patent.PatentPath}`))
        .on('close', () => {
          update(patent.patentNumber, 'downloaded');
        })
    } catch (err) {
      return Promise.reject(err)
    }
  })).catch(err => Promise.reject(err));
}

/** createPatentQuery is an async function that maps the array of records
 * into arrays of promises that resolve to queries that write to the DB
 * 
 * @param {Object} params connection Parameters 
 * @param {*} patentList Array of patentRecord objects
 * @param {Function} update Callback to pass update information back to the front-end
 * @param {Object} claimFilter Used to filter out certain claims, eg claim 1 only or independent only
 */
const createPatentQuery = (params, patentList, update, claimFilter = false) => new Promise(async (resolve, reject) => {

  const filterTest = claim => !claimFilter || !!claim[claimFilter.field].toString().match(claimFilter.value);

  try {
    const result = await Promise.all(patentList.map(patent => insertNewPatents(params, patent, () => update(patent.PatentNumber, 'patent inserted')))).catch(err => {
      console.error('error writing patent record', err);
      return reject(err);
    });
    // result is an array of [{Claims:[claimRecords]}, ...]
    console.log('patent data written, writing claims', result.map(patent => `${patent.Claims.filter(filterTest).map(claim => claim.ClaimNumber).join(', ')}`));
    const claims = flatten(result.map(patent => patent.Claims));
    const summary = await Promise.all(claims.filter(filterTest).map(claim => insertClaims(params, claim))).catch(err => {
      console.error('error writing claims')
      return reject(err);
    });
    patentList.map(patent => update(patent.PatentNumber, 'claims inserted'));
    return resolve(summary);
    // returns an array of {[{PatentID, ClaimNumber}]}
  } catch (err) {
    return reject(err);
  }
})



module.exports = {
  downloadPatents,
  createPatentQuery
}