//const Nightmare = require('nightmare');
const fetch = require('node-fetch');
const fse = require('fs-extra');

/** getClaimData sets the patent ID for a set of claims
 * @param claims: Array of claim objects
 * @param patentID: number the ID from the database for the patent added
 * @returns an array of updated claims
 **/

const getClaimData = (claims, patentID) => {
  return claims.map(x => x.patentID = patentID);
}

/**downloadPatents takes an array of url's and downloads them SLICE_SIZE at a time
 * @param {Array<Object>} recordList array of records from the google query in Main
 * @param {string} dropBoxPath
 * @returns {void}
 */

const downloadPatents = async (recordList, dropBoxPath) => {

  const SLICE_SIZE = 3;
  let currentSlice = [];
  let blobs = [];
  // convert the incoming record file into an array of {downloadLink, PatentPath}
  const patentList = recordList.map(x => ({ downloadLink: x.downloadLink, PatentPath: x.PatentPath }));

  const getNextSlice = async newStart => {
    if (newStart > patentList.length) {
      return;
    }
    currentSlice = patentList.slice(newStart, newStart + SLICE_SIZE);
    blobs = Promise.all(currentSlice.map(async patent => {
      try {
        return await (await fetch(patent.downloadLink)).body
          .pipe(fse.createWriteStream(`${dropBoxPath}${patent.PatentPath}`))
          .on('close', () => console.log('file downloaded'))
      } catch (err) {
        return Promise.reject(err)
      }
    })
    );
    return getNextSlice(newStart + SLICE_SIZE);
  }

  return await getNextSlice(0);

}


module.exports = {
  getClaimData,
  downloadPatents
}