const electron = require('electron');
const exec = require('child_process').exec;
const dbquery = require('./js/app_DBconnect');
const htmlparse = require('./js/app_htmlparsetempl');
const urlParse = require('./js/app_urlParse');
let changeLog = require('./changeLog.json');

const fs = require('fs');
const { app, BrowserWindow, shell, ipcMain, dialog } = electron;

let win;
let savedSearch = {
    "where": "",
    "paramArray": []
}; //used for saved searches
let dropboxPath = ""; // keeps the path to the local dropbox
let htmlContent = "";
let queryType = "";

exec('sqllocaldb s v11.0', (err, stdout, stderr) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(stdout);
});

function createWindow() {
    "use strict";
    // get the file paths
    getDropBoxPath();
    // start a connection, to hide some of the startup time for first connection
    //runNewQuery('TEST',null, null);
    // Create the browser window.
    win = new BrowserWindow({
        width: 1440,
        height: 800
    });
    // and load the index.html of the app.
    win.loadURL(`file://${__dirname}/index.html`);
    // Open the DevTools.
    //win.webContents.openDevTools();
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

// Listener for updating a potential application
ipcMain.on('update_application', function (ua_event, claimID, oldValues, newValues) {
  //log the change to allow future roll-backs
  changeLog.changes.push({"datetime": Date.now(), "claimID": claimID, "from":oldValues, "to":newValues});
  fs.writeFile("./changeLog.JSON", JSON.stringify(changeLog), 'utf8', function (err) {
    if (err) console.log(err);
    console.log("changeLog updated: ",changeLog.changes[changeLog.changes.length-1]);
    // now do the insert query
    dbquery('UPDATE', claimID, newValues.split(), function (err4, result) {
        if (err4) {
              console.log(dialog.showErrorBox("Query Error", "Error with query "+err4));
        }
        console.log (result);
      });
  });
});

// listener to handle when a user clicks on a patent link
ipcMain.on('open_patent', function (op_event, linkVal) {
    console.log("received link click with path " + linkVal);
    openPDF(linkVal);
});

// listener to handle when a user launches a new query
ipcMain.on('new_query', function (op_event, queryJSON, fieldToLoad) {
    //querystring comes back as {srch:"a%20OR%20b", srvl:} etc.
    if (queryJSON.save != true) {
        // don't save the search -- clear the old values
        savedSearch.where = "";
        savedSearch.paramArray = [];
    }
    console.log("new query received with parameters: ", queryJSON);
    if (queryJSON.srch.search("Te") != -1 || queryJSON.srch.search("Co") != -1) {
      queryType = "MARKMAN";
    } else {
      queryType = "SELECT";
    }
    urlParse(queryJSON, savedSearch.where, savedSearch.paramArray, function (err5, whereClause, valueArray) {
        if (err5) {
            console.log(dialog.showErrorBox("URL Parse Error", "Error parsing url parameters: "+queryJSON+"\n"+err5));
        } else {
            runNewQuery(whereClause, valueArray); // now update the results table
            //TODO: what if the last search was already saved ? don't want to keep appending
            if (queryJSON.save != true) {
              // only overwrite the savedSearch values if we haven't already saved some yet
              savedSearch.where = whereClause; // save the last search for posterity
              savedSearch.paramArray = valueArray; // save the last search for posterity
            }
        }
    }); //urlParse
}); //new_query handler

function openPDF(fullPath) {
    console.log("trying shell: " + dropboxPath + fullPath);
    shell.openItem(dropboxPath + fullPath);
}

// RunNewQuery is called once the URL parameters have been parsed
function runNewQuery(queryString, values) {
    // call the query module with querystring and then html parse the results
    console.log("querying DB ...");
    dbquery(queryType, queryString, values, function (err3, queryResults) {
        if (err3) {
            console.log(dialog.showErrorBox("Query Error", "Error with query "+err3));
            return;
        }
        if (queryResults != 'connect') {
        console.log("good query - " + queryResults.length + " results returned");
        console.log("parsing to html ...");
        htmlparse(queryResults, function (err4, outputString) {
            if (err4) {
                console.log(dialog.showErrorBox("HTML Parse Error", "Error Parsing query to HTML: "+err4));
                return;
            }
            console.log("sending html-formatted table with "+queryResults.length+" rows to renderer window");
            // htmlString contains the table-formatted query
            // don't merge ! just send back to the renderer
            win.webContents.send('tableReady', outputString, queryResults.length);
        });
      }
    });
}

function getDropBoxPath() {
    fs.readFile(process.env.LOCALAPPDATA + '//Dropbox//info.json', 'utf8', function (err2, pathdata) {
        if (err2) {
            console.log(dialog.showErrorBox("Dropbox Error", "Error getting Dropbox path "+ err2));
            return;
        }
        // first, get the path to the local Dropbox folder and change the \ to /
        dropboxPath = "C\:/" + JSON.parse(pathdata).business.path.match(/:\\(.+)/)[1].replace(/\\/g, "/") + "/";
        console.log("Good DropBox Path:", dropboxPath);
    });
}
