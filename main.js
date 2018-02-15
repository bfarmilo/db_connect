const electron = require('electron');
const { getDropBoxPath } = require('./js/getDropBoxPath');
const dbquery = require('./js/app_DBconnect');
// these are for old style queries
const runNewQuery = require('./js/app_runNewQuery');
const urlParse = require('./js/app_urlParse');
const htmlparse = require('./js/app_htmlparsetempl');
//
const changeLog = require('./changeLog.json');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;
const { connectDocker } = require('./js/connectDocker');
const { getFullText } = require('./js/getFullText');
const { patentDB } = require('./js/app_config.json');
const { parseQuery } = require('./js/app_sqlParse');
// developer
const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
// other constants
const { app, BrowserWindow, shell, ipcMain, dialog } = electron;
let win;
let markmanwin;
let detailWindow = null;
let connectParams;
const savedSearch = {
  where: '',
  paramArray: [],
}; // used for saved searches
let dropboxPath = ''; // keeps the path to the local dropbox
let queryType = '';
let uriMode = process.env.USEDB === 'NextIdea'; // flag that indicates if claim HTML is uri-encoded or not

connectDocker(patentDB.connection)
  .then(params => {
    connectParams = params;
    console.log('new connection parameters set: %j', connectParams);
  })
  .catch(err => console.error(err));

function openPDF(fullPath) {
  console.log(`trying shell: ${dropboxPath}${fullPath}`);
  shell.openItem(dropboxPath + fullPath);
}

function createWindow() {
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
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

  const updateRenderWindow = (newData) => {
    console.log('sending state for patent', newData.PMCRef);
    detailWindow.webContents.send('state', newData);
    detailWindow.show();
  }

  const sendUpdate = () => {
    console.log('got call for patent detail view with patent number', patentNumber);
    dbquery(connectParams, 'p_PATENT', `WHERE PatentNumber=@0 FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER`, [patentNumber], (err, data) => {
      if (err) {
        console.error(err)
      } else {
        // TODO: if the query returns PatentHtml, serve it up,
        // otherwise, go fetch it, serve it up, and meanwhile update the DB with it !
        // data returns the row in multiple columns of an array (if large)
        const state = JSON.parse(data.reduce((accum, item) => accum.concat(item), ''));
        if (!state.PatentHtml) {
          console.log('no PatentHtml found, querying USPTO for patent Full Text');
          getFullText(patentNumber)
            .then(PatentHtml => {
              state.PatentHtml = JSON.stringify(PatentHtml);
              dbquery(connectParams, 'u_FULLTEXT', '', [state.PatentHtml, state.PatentID], (err2, status) => {
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
      console.log('window ready, calling sendUpdate');
      sendUpdate();
    })
  } else {
    sendUpdate();
  }
})

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
// Listener for updating a potential application
ipcMain.on('update_application', (uaEvent, claimID, oldValues, newValues) => {
  // log the change to allow future roll-backs
  changeLog.changes.push({ datetime: Date.now(), claimID, from: oldValues, to: newValues });
  fse.writeJSON('./changeLog.JSON', changeLog, 'utf8', (err) => {
    if (err) { console.error(err) } else {
      console.log(`changeLog updated: ${JSON.stringify(changeLog.changes[changeLog.changes.length - 1])}`);
      // now do the insert query
      dbquery(connectParams, 'u_UPDATE', claimID, newValues.split(), (err4, result) => {
        if (err4) {
          console.error(dialog.showErrorBox('Query Error', `Error with update query ${err4}`));
        } else {
          console.log('Potential Application', result);
          win.send('ready');
        }
      });
    }
  });
});

ipcMain.on('update_watch', (uaEvent, claimID, oldValues, newValues) => {
  // log the change to allow future roll-backs
  changeLog.changes.push({ datetime: Date.now(), claimID, from: oldValues, to: newValues, column: 'WatchItems' });
  fse.writeJSON('./changeLog.JSON', changeLog, 'utf8', (err) => {
    if (err) { console.error(err) } else {
      console.log(`changeLog updated: ${JSON.stringify(changeLog.changes[changeLog.changes.length - 1])}`);
      // now do the insert query
      dbquery(connectParams, 'u_WATCH', claimID, newValues.split(), (err4, result) => {
        if (err4) {
          console.error(dialog.showErrorBox('Query Error', `Error with update query ${err4}`));
        } else {
          console.log('Watch Item updated', result);
          win.send('ready');
        }
      });
    }
  });
});

// listener to handle when a user clicks on a patent link
ipcMain.on('open_patent', (opEvent, linkVal) => {
  console.log(`received link click with path ${linkVal}`);
  openPDF(linkVal);
});

ipcMain.on('json_query', (event, query) => {
  console.log('got query object %s', JSON.stringify(query, null, 1));
  //remove duplicates and create an array of ({field, value}) objects
  const fieldList = Object.keys(query).filter(item => query[item] !== '').map(item => ({ field: item, value: query[item] }));
  //make sure to URI-encode ClaimHtml if appropriate
  if (uriMode && fieldList.ClaimHtml) {
    fieldList.ClaimHtml = encodeURIComponent(fieldList.ClaimHtml).replace(/\'/g, '%27').replace('%', '[%]');
  }
  //in the case where a blank query is passed, default query is only show claim 1
  const parsedQuery = fieldList.length > 0 ? parseQuery(fieldList) : { where: 'claims.ClaimNumber LIKE @0', param: ['%'] };
  dbquery(connectParams, 'p_SELECTJSON', `WHERE ${parsedQuery.where} FOR JSON AUTO`, parsedQuery.param, (err, result) => {
    if (err) {
      console.error(err);
    } else {
      // query comes down as an array of chunks. So need to join the chunks,
      // Parse as JSON, then send to window
      win.webContents.send('json_result', result.length > 0 ? JSON.parse(result.join('')) : '');
    }
  })
});

// listener to handle when a user launches a new query
ipcMain.on('new_query', (opEvent, queryJSON) => {
  // querystring comes back as {srch:'a%20OR%20b', srvl:} etc.
  if (queryJSON.save !== true) {
    // don't save the search -- clear the old values
    savedSearch.where = '';
    savedSearch.paramArray = [];
  }
  // in uriMode, need to convert % to [%] to parse SQL properly
  // NOTE: Only do this for Uri encoded fields (namely, Claim full text only at this point)
  if (uriMode && queryJSON.srch === 'Cl') queryJSON.srvl = encodeURIComponent(queryJSON.srvl).replace(/\'/g, '%27').replace('%', '[%]');
  console.log(`new query received with parameters: ${JSON.stringify(queryJSON)}`);
  if (queryJSON.srch.search('Te') !== -1 || queryJSON.srch.search('Co') !== -1 || queryJSON.srch.search('Nu') !== -1) {
    queryType = 'm_MARKMANALL';
  } else {
    queryType = 'p_SELECT';
  }
  urlParse(queryJSON, savedSearch, (err5, whereClause, valueArray) => {
    if (err5) {
      console.error(dialog.showErrorBox('URL Parse Error', `Error parsing url parameters: ${queryJSON}\n ${err5}`));
    } else {
      console.log(whereClause, valueArray);
      runNewQuery(connectParams, queryType, whereClause, valueArray, (err6, queryResults) => {
        if (err6) {
          console.error(dialog.showErrorBox('Query Error', `Error with query: ${whereClause} ${valueArray}\n ${err6}`));
        } else {
          console.log('parsing to html ...');
          htmlparse(queryType, queryResults, uriMode, (err4, outputString) => {
            if (err4) {
              console.error(dialog.showErrorBox('HTML Parse Error', `Error Parsing query to HTML: ${err4}`));
            } else {
              console.log(`sending html-formatted table with ${queryResults.length} rows to renderer window`);
              win.webContents.send('tableReady', outputString, queryResults.length); // now update the results table
            }
          });
          if (queryJSON.save !== true) {
            // only overwrite the savedSearch values if we haven't already saved some yet
            savedSearch.where = whereClause; // save the last search for posterity
            savedSearch.paramArray = valueArray; // save the last search for posterity
          }
        }
      });
    }
  }); // urlParse
}); // new_query handler