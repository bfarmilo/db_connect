const electron = require('electron');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;
// local modules
const { getDropBoxPath } = require('./js/getDropBoxPath');
const { queryDatabase } = require('./js/app_DBconnect');
const { connectDocker } = require('./js/connectDocker');
const { getFullText } = require('./js/getFullText');
const { parseQuery, parseOrder, parseOutput } = require('./jsx/app_sqlParse');
const { createPatentQuery, downloadPatents } = require('./jsx/getPatents.js');
// configuration
const changeLog = require('./changeLog.json');
const { patentDB } = require('./js/app_config.json');
// developer
const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
// other constants
const { app, BrowserWindow, shell, ipcMain, dialog } = electron;

// windows we may decide to open
let win;
let markmanwin;
let detailWindow = null;
let getPatentWindow;
let newPatentWindow;

// globals
let totalCount = 0;
let dropboxPath = ''; // keeps the path to the local dropbox

// global constants
const ROWS_TO_RETURN = 200;
const SLICE_SIZE = 3;
const databases = {
  PMCDB: { uriMode: false, next: "NextIdea" },
  NextIdea: { uriMode: true, next: "GeneralResearch" },
  GeneralResearch: { uriMode: true, next: "PMCDB" }
};

// database parameters
let connectParams;
let uriMode; // flag that indicates if claim HTML is uri-encoded or not, default to false

// connect to the sql server
connectDocker(patentDB.connection)
  .then(params => {
    connectParams = params;
    uriMode = databases[connectParams.options.database].uriMode
    console.log('new connection parameters set: %j', connectParams);
  })
  .catch(err => console.error(err));

/** openPDF will try to open a pdf file using the shell
 * 
 * @param {String} fullPath
 * @returns {void}
 */
const openPDF = (fullPath) => {
  console.log(`trying shell: ${dropboxPath}${fullPath}`);
  shell.openItem(dropboxPath + fullPath);
}

/** createWindow launches the main window
 *  @returns {void}
 */
const createWindow = () => {
  // get the file paths
  getDropBoxPath((err, dropbox) => {
    if (err) {
      console.error(err);
    } else {
      dropboxPath = dropbox;
    }
  });
  // Create the browser window.
  win = new BrowserWindow({
    width: 1440,
    height: 800,
  });
  // and load the index.html of the app.
  win.loadURL(`file://${__dirname}/claimtable.html`);
  // Open the DevTools.
  installExtension(REACT_DEVELOPER_TOOLS).then(name => {
    console.log(`Added Extension:  ${name}`);
    win.webContents.openDevTools();
  })
    .catch(err => {
      console.error('An error occurred: ', err);
    });
  win.on('resize', () => {
    console.log('window size changed, sending new size');
    win.webContents.send('resize', { width: win.getSize()[0], height: win.getSize()[1] });
  });
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    if (detailWindow) detailWindow.close();
    if (markmanwin) markmanwin.close();
    if (newPatentWindow) newPatentWindow.close();
    win = null;
  });
}

/** getAllPatents retrieves data and creates an array of results
 * uses global uriMode
 * @param {Object<number>} patentList an array of patents to retrieve, in XXXXXXX form
 * @param {String} patentRef the PMC Reference to associate with each patent TODO NEEDS WORK
 * @param {String} basePath the path from the dropbox to the folder where the full PDF's of the patent are stored
 * @returns {Array{Object}} an array of objects ready for sending to TODO downloads, disk, insert or update.
 */
const getAllPatents = (patentList, patentRef, outputPath, startIdx, update) => {
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
   * @param {boolean} uriMode
   * @returns {Object} ready for insertion into the DB
   */
  const getNewPatent = (patentNumber, activeWin, PMCRef, uriMode) => {

    //const activeWin = {...getPatentWindow.get(patentNumber)};

    activeWin.loadURL(`https://patents.google.com/patent/US${patentNumber}/en`);
    activeWin.on('closed', () => {
      getPatentWindow.delete(patentNumber);
    });
    activeWin.on('ready-to-show', () => {
      //activeWin.webContents.openDevTools();
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
    let patentRecords = [];
    let index = 0;
    for (let [patentNumber, browserWin] of getPatentWindow.entries()) {
      patentRecords.push(await getNewPatent(patentNumber, browserWin, `${patentRef} ${startIdx + index}`, uriMode));
      index++;
      update(patentNumber, 'scraped');
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
const writeNewPatents = async (patentList, reference, storagePath, downloadPats, filterClaims, startCount) => {
  let addedList = [];
  const filterOptions = new Map([
    ['independent', { field: 'IsIndependentClaim', value: /true/g }],
    ['dependent', { field: 'IsIndependentClaim', value: /false/g }],
    ['claim1', { field: 'ClaimNumber', value: /^1$/g }],
    ['allbut1', { field: 'ClaimNumber', value: /(^[1].+|^[^1]$)/g }],
    ['all', false]
  ]);
  const claimFilter = filterOptions.get(filterClaims);

  const sendUpdate = (patentNumber, status) => {
    // send to the window to update status
    newPatentWindow.webContents.send('new_patents_ready', [patentNumber, status]);
  };

  const getNextSlice = async newStart => {
    if (newStart > patentList.length) {
      return;
    }
    try {
      const currentSlice = patentList.slice(newStart, newStart + SLICE_SIZE);
      const result = await getAllPatents(currentSlice, reference, storagePath, startCount + newStart, sendUpdate);
      console.log(result.map(patent => `${patent.PatentNumber} (${patent.PMCRef})`));
      if (downloadPats) downloadPatents(result, dropboxPath, sendUpdate);
      addedList.push(await createPatentQuery(connectParams, result, sendUpdate, claimFilter));
      return getNextSlice(newStart + SLICE_SIZE);
    } catch (err) {
      return Promise.reject(err)
    }
  }

  try {
    console.log('downloading data for patents', patentList);
    await getNextSlice(0);
    win.webContents.send('new_patents_ready', addedList);
  } catch (err) {
    console.error(err);
  }
};


/** getNewPatentUI sets up the interface to accept new patents */
const getNewPatentUI = () => {
  if (!newPatentWindow) {
    newPatentWindow = new BrowserWindow();
    newPatentWindow.loadURL(`file://${__dirname}/getNewPatentUI.html`);
    // newPatentWindow.webContents.openDevTools();
    newPatentWindow.on('closed', () => {
      newPatentWindow = null;
    });
  } else {
    newPatentWindow.webContents.focus();
  }
}

// Electron listeners
// initialization and is ready to create browser windows.
app.on('ready', createWindow);
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

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

// Listener for launching new Patent retrieval UI
ipcMain.on('new_patent_retrieval', (e) => getNewPatentUI());

//Listener for launching patent details
ipcMain.on('view_patentdetail', (event, patentNumber) => {

  /** private function that sends new data to the patent detail window
   * @param {Array<records>} newData - the JSON formatted data from the DB
   * @returns {void}
   */
  const updateRenderWindow = (newData) => {
    console.log('sending state for patent', newData.PMCRef);
    detailWindow.webContents.send('state', newData);
    detailWindow.show();
  }

  /** private function that queries the DB then hits the USPTO if empty
   * @returns {void}
   */
  const getPatentHtml = () => {
    console.log('got call for patent detail view with patent number', patentNumber);
    queryDatabase(connectParams, 'p_PATENT', `WHERE PatentNumber=@0`, [patentNumber], ' FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER', (err, data) => {
      if (err) {
        console.error(err)
      } else {
        // if the query returns PatentHtml, serve it up,
        // otherwise, go fetch it, serve it up, and meanwhile update the DB with it !
        // data returns the row in multiple columns of an array (if large)
        const state = JSON.parse(data.reduce((accum, item) => accum.concat(item), ''));
        if (!state.PatentHtml) {
          console.log('no PatentHtml found, querying USPTO for patent Full Text');
          getFullText(patentNumber)
            .then(PatentHtml => {
              state.PatentHtml = JSON.stringify(PatentHtml);
              // now store the new data in the DB for future reference
              queryDatabase(connectParams, 'u_FULLTEXT', '', [state.PatentHtml, state.PatentID], '', (err2, status) => {
                if (err2) {
                  console.error(err2);
                } else {
                  console.log('record updated with new fullText');
                  updateRenderWindow(state);
                }
              })
              return;
            })
            .catch(err3 => console.error(err3))
        } else {
          updateRenderWindow(state);
        }
      }
    })
  }

  if (detailWindow === null) {
    detailWindow = new BrowserWindow({
      width: 800,
      height: 1000,
      show: false,
      //autoHideMenuBar: true
    });
    detailWindow.loadURL(`file://${__dirname}/patentdetail.html`);
    detailWindow.on('closed', () => {
      detailWindow = null;
    });
    detailWindow.on('ready-to-show', () => {
      console.log('window ready, calling getPatentHtml');
      getPatentHtml();
    })
  } else {
    getPatentHtml();
  }
})

// listener to handle when a user clicks on a patent link
ipcMain.on('open_patent', (opEvent, linkVal) => {
  console.log(`received link click with path ${linkVal}`);
  openPDF(linkVal);
});

// Listener for manual closing of the patent window via X button
ipcMain.on('close_patent_window', event => {
  detailWindow.close();
})

// Listener for launching the Markman Linking applications
ipcMain.on('add_claimconstructions', () => {
  // open new window for applications
  markmanwin = new BrowserWindow({
    width: 1440,
    height: 800,
  });
  // and load the index.html of the app.
  markmanwin.loadURL(`file://${__dirname}/markman.html`);
  // Emitted when the window is closed.
  markmanwin.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    markmanwin = null;
  });
  // when the user enters a potential application
  // Load a list of patents, claims, claimID into patentsArray
  // Load list of claim terms & TermID into termsArray
  // Load list of constructions and ConstructID into constructArray
  // when user selects a claim terms
  // load past constructions & Patents, Claims and display on screen
  // ... user selects a patent / claim
  // ... user selects a constructions
  // enable 'update' button
  // when user selects 'update'
  // check to see if patent/claim is selected and construction is connected
  // update mtc table with TermID, ClaimID, ConstructID
  // clear values
  // disable 'update' button
  // when user selects 'close window'
  // confirm if update not applied
  // close window
});

// Listener for changing to the other Databases
ipcMain.on('change_db', event => {
  const newDB = databases[connectParams.options.database].next;
  console.log('changing database to', newDB);
  connectParams.options.database = newDB;
  uriMode = databases[newDB].uriMode;
})

// Listener for a call to update PotentialApplication or WatchItems
ipcMain.on('json_update', (event, oldItem, newItem) => {
  // items have structure patentNumber, index, claimID, field, value
  changeLog.changes.push({ datetime: Date.now(), from: oldItem.value, to: newItem.value });
  fse.writeJSON('./changeLog.json', changeLog, 'utf8')
    .then(() => queryDatabase(connectParams, 'u_UPDATE', ` ${newItem.field}=@0 WHERE ClaimID=@1`, [newItem.value, parseInt(newItem.claimID, 10)], '', (err2, result) => {
      if (err2) {
        console.error(dialog.showErrorBox('Query Error', `Error with update query ${err2}`));
      } else {
        console.log('%s %s', newItem.field, result);
      }
    }))
    .catch(err => console.error(err));
})

// Listener for a call to update the main window
ipcMain.on('json_query', (event, query, orderBy, offset, appendMode) => {

  const runQuery = newOffset => {
    queryDatabase(connectParams, 'p_SELECTJSON', `WHERE ${parsedQuery.where}`, parsedQuery.param, `${parseOrder(orderBy, offset, ROWS_TO_RETURN)} FOR JSON AUTO`, (err, result) => {
      if (err) {
        console.error(err);
      } else {
        // send the result after parsing properly 
        win.webContents.send('json_result', parseOutput(result, uriMode), totalCount, newOffset, appendMode);
      }
    })

  }

  //remove duplicates and create an array of ({field, value}) objects
  const fieldList = Object.keys(query).filter(item => query[item] !== '').map(item => ({ field: item, value: query[item] }));
  console.log('reduced query to %s', JSON.stringify(fieldList));
  //make sure to URI-encode ClaimHtml if appropriate
  if (uriMode && fieldList.ClaimHtml) {
    fieldList.ClaimHtml = encodeURIComponent(fieldList.ClaimHtml).replace(/\'/g, '%27').replace('%', '[%]');
  }
  //in the case where a blank query is passed, default query is only show claim 1
  const parsedQuery = fieldList.length > 0 ? parseQuery(fieldList) : { where: 'claims.ClaimNumber LIKE @0', param: ['%'] };
  if (!appendMode) {
    queryDatabase(connectParams, 'p_COUNT', `WHERE ${parsedQuery.where}`, parsedQuery.param, '', (err, count) => {
      if (err) {
        console.error(err)
      } else {
        totalCount = count[0][0];
        console.log(totalCount);
        runQuery(ROWS_TO_RETURN);
      }
    })
  } else {
    // append mode, figure out the next offset
    runQuery(offset + ROWS_TO_RETURN <= totalCount ? offset + ROWS_TO_RETURN : offset);
  }
});