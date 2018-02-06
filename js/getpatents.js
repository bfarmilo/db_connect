const Nightmare = require('nightmare');
const fetch = require('node-fetch');
const fse = require('fs-extra');

let testMode = false;
let nightmare = {};

/** 
 * getPatentData queries USPTO and Google to retreive the following information
 * @param {number} patentNumber: number the patent number without commas
 * @param {string} PMCRef: string designation for family
 * @param {string} dropBoxPath: path to local dropbox
 * @param {string} outputPath: path to save PDF's
 * @param {boolean}
 * @param {boolean} testMode: boolean true for showing the browser
 * @returns Promise that resolves to {
 * PatentUri: US.x,xxx,xxx.B1,
 * PMCRef,
 * Title,
 * ClaimsCount,
 * PatentNumber,
 * IndependentClaimsCount,
 * Number,
 * IsInIPR: 0,
 * TechnologySpaceID: 1,
 * TechnologySubSpaceID: 1,
 * CoreSubjectMatterID: 1,
 * PatentPath
 * }
 * **/

const getPatentData = (patentNumber, PMCRef, dropBoxPath, outputPath, uriMode, testMode = false) => {
  let patentRecord = {};
  let downloadURL = '';

  if (testMode) {
    nightmare = Nightmare({
      openDevTools: {
        mode: 'detach'
      },
      show: true
    });
  } else {
    nightmare = Nightmare();
  }

  console.log('retrieving %s patent %d', PMCRef, patentNumber);
  return nightmare
    .goto(`https://patents.google.com/patent/US${patentNumber}/en`)
    .evaluate(encodeURI => {
      const result = {};
      result.PatentPath = document.querySelector('.knowledge-card-action-bar a').href;
      // code to select (application) Number
      result.Number = document.querySelector('.applist .approw .appno b').innerHTML
        // formatted as USAABBBCCC
        // need to reformat as AA/BBB,CCC
        .replace(/US(\d{2})(\d{3})(\d{3})/, '$1/$2,$3');
      // code to select Title
      result.Title = document.querySelector('#title').innerHTML
        //now clean off whitespace
        .trim().split('\n')[0];
      // code to select the download URL
      result.downloadLink = document.querySelector('a.style-scope.patent-result').href;
      // code to select PatentUri
      result.PatentUri = document.querySelector('.knowledge-card h2').innerHTML
        // formatted as USXYYYZZZBB
        // reformat to US.XYYYZZZ.BB
        .replace(/(US)(\d{7})(\w+)/, '$1.$2.$3');
      // code to select ClaimsCount and IndependentClaimsCount
      // select all claims then count all top-level divs where class !== claim-dependent
      // note condition claims to exclude JSON-ineligible characters
      const claimChildren = Array.from(document.querySelector('#claims #text .claims').children);
      result.Claims = claimChildren
        .filter(y => y.localName !== 'claim-statement')
        .map(x => ({
          ClaimNumber: parseInt(x.innerText.match(/(\d+)\./)[1], 10),
          ClaimHTML: encodeURI ? encodeURIComponent(x.outerHTML.trim()).replace(/\'/g, '%27') : x.outerHTML,
          IsMethodClaim: x.innerText.includes('method'),
          IsDocumented: false,
          IsIndependent: !x.className.includes('claim-dependent'),
          PatentID: 0
        }));
      result.IndependentClaimsCount = claimChildren.filter(y => y.localName !== 'claim-statement' && !y.className.includes('claim-dependent')).length;
      result.ClaimsCount = result.Claims.length;
      console.log('got result', result);
      return result;
    }, uriMode)
    .end()
    .then(result => {
      patentRecord = { ...result };
      patentRecord.PatentNumber = patentNumber;
      patentRecord.PMCRef = PMCRef;
      patentRecord.IsInIPR = false;
      patentRecord.TechnologySpaceID = 1;
      patentRecord.TechnologySubSpaceID = 1;
      patentRecord.CoreSubjectMatterID = 1;
      patentRecord.PatentPath = `${outputPath}US${patentNumber}.pdf`;
      console.log('returning patent ', patentRecord.PMCRef);
      return Promise.resolve(patentRecord);
    })
    .catch(err => Promise.reject(err))
}

/** getClaimData sets the patent ID for a set of claims
 * @param claims: Array of claim objects
 * @param testMode: bool true for visible nightmare instance
 * @param patentID: number the ID from the database for the patent added
 * @returns an array of updated claims
 **/

const getClaimData = (claims, patentID, testMode) => {
  return claims.map(x => x.patentID = patentID);
}

/**downloadPatents takes an array of url's and downloads them SLICE_SIZE at a time
 * @param {Array<string>} patentList list of url's in string form
 * @param {string} dropBoxPath
 * @param {string} outputPath
 * @returns {void}
 */

const downloadPatents = async (recordList, dropBoxPath) => {

  const SLICE_SIZE = 3;
  let currentSlice = [];
  let blobs = [];
  // convert the incoming record file into an array of {downloadLink, PatentPath}
  const patentList = recordList.map(x => ({ downloadLink: x.downloadLink, PatentPath: x.PatentPath }));

  const getNextSlice = newStart => {
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
  getPatentData,
  getClaimData,
  downloadPatents
}