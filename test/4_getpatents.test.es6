const fse = require('fs-extra');
const { getPatentData, getClaimData, downloadPatents } = require('../jsx/getPatents');
const outputFile = './test/patentRecord.json';
const { getDropBoxPath } = require('../js/getDropBoxPath');
const electron = require('electron');
// other constants
const { app, BrowserWindow, ipcMain } = electron;

// USAGE set USEDB=NextIdea & node ./test/4_getpatents.test.js [path_to_pdf] [PMC Ref]

let basePath = process.argv[2] || '\\Bills Swap\\' //'PMC Public\\PMC GENERAL\\Opportunities\\Single touch\\' || 'PMC Public\\Licensing\\PMC Patents OCR\\';
let patentRef = process.argv[3] || 'SINGLE' || 'NAVI 81B';
const useIdx = process.env.USEDB === 'NextIdea';
const uriMode = useIdx;
let dropboxPath;

const patentList = [
  5164831,
  8773401
]

/* patentList.sort();

getDropBoxPath((err, dropBox) => {
    if (err) {
        console.error(err)
    } else {
        console.log('got dropbox path %s', dropBox);
        Promise.all(patentList.map((pat, idx) => getPatentData(pat, `${patentRef}${useIdx ?` ${idx+1}` : ''}`, dropBox, basePath, uriMode)))
            .then(result => {
                fse.writeJSON(outputFile, { Patents: result });
                return downloadPatents(result, dropBox);
            })
            .then(() => console.log('file successfully written'))
            .catch(err => console.error(err));
    }
}) */

const getNewPatent = (patentNumber, PMCRef, outputPath, uriMode, testMode = false) => {

  const activeWin = getPatentWindow.get(patentNumber);
  /** @private parseScript parses JS code into a string
   * @returns {string}
   */
  const parseScript = () => {
    return `
    require('electron').ipcRenderer.send('result_ready', {
      PatentPath: document.querySelector('.knowledge-card-action-bar a').href,
      Number: document.querySelector('.applist .approw .appno b').innerHTML,
      Title: document.querySelector('#title').innerHTML,
      downloadLink: document.querySelector('a.style-scope.patent-result').href,
      PatentUri: document.querySelector('.knowledge-card h2').innerHTML,
      Claims: Array.from(document.querySelector('#claims #text .claims').children).map(claim => ({localName: claim.localName, outerHTML:claim.outerHTML, innerText:claim.innerText, className:claim.className}))
    });
    `
  };

  activeWin.loadURL(`https://patents.google.com/patent/US${patentNumber}/en`);
  activeWin.on('closed', () => {
    getPatentWindow.delete(patentNumber);
  });
  activeWin.on('ready-to-show', () => {
    activeWin.webContents.openDevTools();
    console.log('window ready, executing in-page JS');
    //getPatentWindow.show();
    activeWin.webContents.executeJavaScript(parseScript(), false)
  })

  // content event listeners
  return new Promise(resolve => {
    ipcMain.once('result_ready', (e, result) => {
      console.log('received result event')
      activeWin.close();
      // Number: formatted as USAABBBCC, reformat to AA/BBB,CCC
      // PatentUri: formatted as USXYYYZZZBB, reformat to US.XYYYZZZ.BB
      // Title: trim whitespace
      // Claims: condition claims to exclude JSON-ineligible characters 
      // IndependentClaims: select all claims then count all top-level divs where class !== claim-dependent 
      return resolve(
        {
          ...result,
          Number: result.Number.replace(/US(\d{2})(\d{3})(\d{3})/, '$1/$2,$3'),
          PatentUri: result.PatentUri.replace(/(US)(\d{7})(\w+)/, '$1.$2.$3'),
          Title: result.Title.trim().split('\n')[0],
          Claims: result.Claims.filter(y => y.localName !== 'claim-statement')
            .map(x => ({
              ClaimNumber: parseInt(x.innerText.match(/(\d+)\./)[1], 10),
              ClaimHTML: uriMode ? encodeURIComponent(x.outerHTML.trim()).replace(/\'/g, '%27') : x.outerHTML,
              IsMethodClaim: x.innerText.includes('method'),
              IsDocumented: false,
              IsIndependentClaim: !x.className.includes('claim-dependent'),
              PatentID: 0
            })),
          IndependentClaimsCount: result.Claims.filter(y => y.localName !== 'claim-statement' && !y.className.includes('claim-dependent')).length,
          ClaimsCount: result.Claims.length,
          PatentNumber: patentNumber,
          PMCRef,
          IsInIPR: false,
          TechnologySpaceID: 1,
          TechnologySubSpaceID: 1,
          CoreSubjectMatterID: 1,
          PatentPath: `${outputPath}US${patentNumber}.pdf`,
        }
      );
    });
  });
}

const getAllPatents = () => {
  getPatentWindow = new Map(patentList.map(patent => [patent, new BrowserWindow({ show: false })]));
  Promise.all(
    [...getPatentWindow.keys()].map(patentNumber => getNewPatent(patentNumber, patentRef, basePath, uriMode, true))
  ).then(results => console.log(results));
}

let getPatentWindow;

app.on('ready', getAllPatents);
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

