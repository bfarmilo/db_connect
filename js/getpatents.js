const Nightmare = require('nightmare');

let testMode = false;
let nightmare = {};

/** 
 * getPatentData queries USPTO and Google to retreive the following information
 * @param patentNumber: number the patent number without commas
 * @param PMCRef: string designation for family
 * @param testMode: boolean true for showing the browser
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

const getPatentData = (patentNumber, PMCRef, testMode = false) => {
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
    .evaluate(() => {
      const result = {};
      // code to select (application) Number
      result.Number = document.querySelector('.applist .approw .appno b').innerHTML
        // formatted as USAABBBCCC
        // need to reformat as AA/BBB,CCC
        .replace(/US(\d{2})(\d{3})(\d{3})/, '$1/$2,$3');
      // code to select Title
      result.Title = document.querySelector('#title').innerHTML
        //now clean off whitespace
        .trim().split('\n')[0];
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
          ClaimNumber: parseInt(x.innerText.match(/(\d+)\./)[1],10), 
          ClaimHTML: encodeURIComponent(x.outerHTML.trim()).replace(/\'/g, '%27'),
          IsMethodClaim: x.innerText.includes('method') ? 1 : 0,
          IsDocumented: 0,
          PatentID: 0
        }));
      result.IndependentClaimsCount = claimChildren.filter(y => y.localName !== 'claim-statement' && !y.className.includes('claim-dependent')).length;
      result.ClaimsCount = result.Claims.length;
      return result;
    })
    .end()
    .then(result => {
      const patentRecord = { ...result };
      patentRecord.patentNumber = patentNumber;
      patentRecord.PMCRef = PMCRef;
      patentRecord.IsInIPR = 0;
      patentRecord.TechnologySpaceID = 1;
      patentRecord.TechnologySubSpaceID = 1;
      patentRecord.CoreSubjectMatterID = 1;
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

module.exports = {
  getPatentData,
  getClaimData
}