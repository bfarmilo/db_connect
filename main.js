const electron = require('electron');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;
// local modules
const { getDropBoxPath } = require('./js/getDropBoxPath');
const { queryDatabase } = require('./js/app_DBconnect');
const { connectDocker } = require('./js/connectDocker');
const { getFullText } = require('./js/getFullText');
const { parseQuery, parseOrder, parseOutput } = require('./jsx/app_sqlParse');
// configuration
const changeLog = require('./changeLog.json');
const { patentDB } = require('./js/app_config.json');
// developer
const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
// other constants
const { app, BrowserWindow, shell, ipcMain, dialog } = electron;
let win;
let markmanwin;
let detailWindow = null;
let connectParams;
let dropboxPath = ''; // keeps the path to the local dropbox
let uriMode = process.env.USEDB === 'NextIdea'; // flag that indicates if claim HTML is uri-encoded or not
let totalCount = 0;

const ROWS_TO_RETURN = 200;

connectDocker(patentDB.connection)
  .then(params => {
    connectParams = params;
    console.log('new connection parameters set: %j', connectParams);
  })
  .catch(err => console.error(err));

// This method will be called when Electron has finished

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
    win = null;
  });
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

// Listener for changing to the other Database
ipcMain.on('change_db', event => {
  const newDB = connectParams.options.database === 'PMCDB' ? 'NextIdea' : 'PMCDB';
  console.log('changing database to', newDB);
  connectParams.options.database = newDB;
  uriMode = newDB === 'NextIdea';
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