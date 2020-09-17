import fetch from 'electron-fetch';
import fse from 'fs-extra';

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



module.exports = {
  downloadPatents
}