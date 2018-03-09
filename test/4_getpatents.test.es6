const fse = require('fs-extra');
const { downloadPatents, createPatentQuery } = require('../jsx/getPatents');
const outputFile = './test/patentRecord.json';
const { getDropBoxPath } = require('../js/getDropBoxPath');
const electron = require('electron');
// other constants
const { app, BrowserWindow, ipcMain, dialog } = electron;

// USAGE set USEDB=NextIdea & node ./test/4_getpatents.test.js [path_to_pdf] [PMC Ref]

let basePath = process.argv[2] || '\\Bills Swap\\' //'PMC Public\\PMC GENERAL\\Opportunities\\Single touch\\' || 'PMC Public\\Licensing\\PMC Patents OCR\\';
let patentRef = process.argv[3] || 'SINGLE' || 'NAVI 81B';
const useIdx = process.env.USEDB === 'NextIdea';
const uriMode = true;
let dropboxPath;

let newPatentWindow;

const patentList = [
  5164831,
  8773401
]

getDropBoxPath((err, dropBox) => {
  if (err) {
    console.error(err)
  } else {
    console.log('got dropbox path %s', dropBox);
    dropboxPath = dropBox;
  }
});

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


/** needs globals uriMode, dropboxPath */
/*************************************************TEST ZONE */


/** getAllPatents retrieves data and creates an array of results
 * uses global uriMode
 * @param {Object<number>} patentList an array of patents to retrieve, in XXXXXXX form
 * @param {String} patentRef the PMC Reference to associate with each patent TODO NEEDS WORK
 * @param {String} basePath the path from the dropbox to the folder where the full PDF's of the patent are stored
 * @returns {Array{Object}} an array of objects ready for sending to TODO downloads, disk, insert or update.
 */
const getAllPatents = (patentList, patentRef, outputPath, startIdx = 1) => {
  // create a map of hidden browser windows indexed by a patent number
  const getPatentWindow = new Map(patentList.map(patent => [patent, new BrowserWindow({ show: false })]));

  const scrapeCode = `require('electron').ipcRenderer.send('result_ready', {
    PatentPath: document.querySelector('.knowledge-card-action-bar a').href,
    Number: document.querySelector('.applist .approw .appno b').innerHTML,
    Title: document.querySelector('#title').innerHTML,
    downloadLink: document.querySelector('a.style-scope.patent-result').href,
    PatentUri: document.querySelector('.knowledge-card h2').innerHTML,
    Claims: Array.from(document.querySelector('#claims #text .claims').children).map(claim => ({localName: claim.localName, outerHTML:claim.outerHTML, innerText:claim.innerText, className:claim.className}))
  });`;

  /** @private getNewPatent sets up the (hidden) patent retrieval window
   * pushes in Javascript, and returns a patent Record
   * @param {number} patentNumber
   * @param {string} PMCRef
   * @param {string} outputPath
   * @param {boolean} uriMode
   * @returns {Object} ready for insertion into the DB
   */
  const getNewPatent = (patentNumber, activeWin, PMCRef, outputPath, uriMode) => {

    //const activeWin = {...getPatentWindow.get(patentNumber)};

    activeWin.loadURL(`https://patents.google.com/patent/US${patentNumber}/en`);
    activeWin.on('closed', () => {
      getPatentWindow.delete(patentNumber);
    });
    activeWin.on('ready-to-show', () => {
      activeWin.webContents.openDevTools();
      console.log('window ready, executing in-page JS for patent', patentNumber);
      //getPatentWindow.show();
      activeWin.webContents.executeJavaScript(scrapeCode, false)
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
            PatentPath: `${outputPath}\\US${patentNumber}.pdf`,
          }
        );
      });
    });
  }

  /** @private stepThroughPatents old-school sequential screen scraping
   * @returns {Array<patentRecord>}
   */
  const stepThroughPatents = async () => {
    let patentRecords=[];
    let index = 0;
    for (let [patentNumber, browserWin] of getPatentWindow.entries()) {
      patentRecords.push(await getNewPatent(patentNumber, browserWin, `${patentRef} ${startIdx + index}`, uriMode));
      index++;
    };
    return patentRecords;
  }

  return Promise.resolve(stepThroughPatents());
}

/** Calls functions to write patent record to the DB and [optionally] download PDF's to the Dropbox
 * Uses globals dropBoxPath and connectParams
 * 
 * @param {Array<PatentRecords>} patentList -> a list of patent records returned from the internet
 * @param {String} reference -> PMCRef to apply to the new collection
 * @param {String} storagePath -> Mount point on the dropbox to store PDF's
 * @param {boolean} downloadPats [opt] -> True if patents need to be downloaded
 */
const writeNewPatents = (patentList, reference, storagePath, downloadPats, startCount) => {
  console.log('downloading data for patents', patentList);
  // coerce patentList into an array if it isn't already
  //TODO: Assign references more smartly
  getAllPatents(patentList, reference, storagePath, startCount)
    .then(result => {
      console.log(result.map(patent => `${patent.PatentNumber} (${patent.PMCRef}) Claims: ${patent.Claims.map(claim => claim.ClaimNumber).join(', ')}`));
      if (downloadPats) downloadPatents(result, dropboxPath);
      return createPatentQuery(connectParams, result);
    })
    .then(idList => console.log('new_patents_ready', idList)) //win.webContents.send('new_patents_ready', idList))
    .catch(error => console.error(error))
}

/** getNewPatentUI sets up the interface to accept new patents */
const getNewPatentUI = () => {
  newPatentWindow = new BrowserWindow();
  newPatentWindow.loadURL(`file://${__dirname}/../getNewPatentUI.html`);
  // newPatentWindow.webContents.openDevTools();
  newPatentWindow.on('closed', () => {
    newPatentWindow = null;
  });
}

//Listener for getting a patent and loading the DB, optionally downloading it
ipcMain.on('get_new_patents', (event, ...args) => writeNewPatents(...args));

// Listener for selecting a new browse point for saving new patents
ipcMain.on('browse', (e, startFolder) => {
  console.log(`${dropboxPath}${startFolder}`);
  dialog.showOpenDialog(newPatentWindow,
    {
      defaultPath: `${dropboxPath}${startFolder}`,
      properties: ['openDirectory']
    }, folder => {
      console.log(folder);
      newPatentWindow.webContents.send('new_folder', folder[0].split(dropboxPath)[1]);
    })
})

/******************************END TEST ZONE */

app.on('ready', getNewPatentUI);
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

