const electron = require('electron');
const { getDropBoxPath } = require('./js/getDropBoxPath');
const runNewQuery = require('./js/app_runNewQuery');
const dbquery = require('./js/app_DBconnect');
const urlParse = require('./js/app_urlParse');
const htmlparse = require('./js/app_htmlparsetempl');
const changeLog = require('./changeLog.json');
const connectParams = require('./js/app_config.json').patentDB.connection;
const fse = require('fs-extra');
const spawn = require('child_process').spawn;
// other constants
const { app, BrowserWindow, shell, ipcMain, dialog } = electron;
let win;
let markmanwin;
const savedSearch = {
  where: '',
  paramArray: [],
}; // used for saved searches
let dropboxPath = ''; // keeps the path to the local dropbox
let queryType = '';
let uriMode = process.env.USEDB === 'NextIdea'; // flag that indicates if claim HTML is uri-encoded or not

// initialize SQL and database connection parameters passed from environment variables
const dbname = process.env.USEDB || 'sqlserver';

const child = spawn("powershell.exe",[`docker inspect --format '{{.NetworkSettings.Networks.nat.IPAddress}}' ${dbname}`]);
child.stdout.on("data",function(data){
  connectParams.server = data.toString().split(/\n/g)[0];
  // uriMode = true; NOTE this messes up compound queries, TODO Fix this
  console.log(`using ${process.env.USEDB||'PMCDB'}, URI Decoding ${uriMode ? 'on' : 'off'}`);
  console.log("connecting with parameters %j", connectParams);
});
child.stderr.on("data",function(data){
    console.log(`Error getting IP address of ${dbname}: ${data}`);
});
child.stdin.end(); //end input


function openPDF(fullPath) {
  console.log(`trying shell: ${dropboxPath}${fullPath}`);
  shell.openItem(dropboxPath + fullPath);
}

function createWindow() {
  // get the file paths
  getDropBoxPath((err, dropbox) => {
    if (err) {
      console.error (err);
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
  win.loadURL(`file://${__dirname}/index.html`);
  // Open the DevTools.
  // win.webContents.openDevTools();
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
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
    if (err) console.log(err);
    console.log(`changeLog updated: ${JSON.stringify(changeLog.changes[changeLog.changes.length - 1])}`);
    // now do the insert query
    dbquery(connectParams, 'u_UPDATE', claimID, newValues.split(), (err4, result) => {
      if (err4) {
        console.log(dialog.showErrorBox('Query Error', `Error with update query ${err4}`));
      }
      console.log(result);
    });
  });
});
// listener to handle when a user clicks on a patent link
ipcMain.on('open_patent', (opEvent, linkVal) => {
  console.log(`received link click with path ${linkVal}`);
  openPDF(linkVal);
});
// listener to handle when a user launches a new query
ipcMain.on('new_query', (opEvent, queryJSON) => {
  // querystring comes back as {srch:'a%20OR%20b', srvl:} etc.
  if (queryJSON.save !== true) {
    // don't save the search -- clear the old values
    savedSearch.where = '';
    savedSearch.paramArray = [];
  }
  if (uriMode) queryJSON.srvl = encodeURIComponent(queryJSON.srvl).replace(/\'/g, '%27').replace('%', '[%]');
  console.log(`new query received with parameters: ${JSON.stringify(queryJSON)}`);
  if (queryJSON.srch.search('Te') !== -1 || queryJSON.srch.search('Co') !== -1 || queryJSON.srch.search('Nu') !== -1) {
    queryType = 'm_MARKMANALL';
  } else {
    queryType = 'p_SELECT';
  }
  urlParse(queryJSON, savedSearch, (err5, whereClause, valueArray) => {
    if (err5) {
      console.log(dialog.showErrorBox('URL Parse Error', `Error parsing url parameters: ${queryJSON}\n ${err5}`));
    } else {
      console.log(whereClause, valueArray);
      runNewQuery(connectParams, queryType, whereClause, valueArray, (err6, queryResults) => {
        if (err6) {
          console.log(dialog.showErrorBox('Query Error', `Error with query: ${whereClause} ${valueArray}\n ${err6}`));
        } else {
          console.log('parsing to html ...');
          htmlparse(queryType, queryResults, uriMode, (err4, outputString) => {
            if (err4) {
              console.log(dialog.showErrorBox('HTML Parse Error', `Error Parsing query to HTML: ${err4}`));
            }
            console.log(`sending html-formatted table with ${queryResults.length} rows to renderer window`);
            win.webContents.send('tableReady', outputString, queryResults.length); // now update the results table
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
