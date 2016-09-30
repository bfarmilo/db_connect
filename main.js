const electron = require('electron');
// Module to control application life.
const { app } = electron;
// Module to create native browser window.
const { BrowserWindow } = electron;
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({ width: 1400, height: 800 });
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
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// npm modules needed
"use strict";
// query and file writing variables
var events = require('events');
var fs = require('fs');
var dbquery = require('./js/app_DBconnect');
var htmlparse = require('./js/app_htmlparse');
var urlParse = require('./js/app_urlParse');
var globalParams = require('./js/app_config.json');
var eventEmitter = new events.EventEmitter();
// server variables
var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var queryJSON = {};
var serve = serveStatic("./");
var servePatents = serveStatic("./"); // just instantiate this for now, will replace with the dropbox path once we have it
var thisresp = {}; // tracks the response object for the 'tableReady' checker.
var savedSearch = ["", []]; //used for saved searches
var propertyCheck = [];
var dropboxPath = ""; // keeps the path to the local dropbox
// called once the file is written !
function fileWritten(err) {
    if (err) {
        console.log("error with writing file");
        return;
    }
    // otherwise all fine
    console.log("File successfully written:", globalParams.outputFileName);
    // emit the 'table Ready' event which is handled by the serveTable callback
    // thisresp doesn't have a value until 'checkFile' is requested
    if (Object.keys(thisresp).indexOf("finished") > -1) {
        eventEmitter.emit('tableReady', thisresp);
        thisresp = {};
    }
} // The FileWritten callback
// RunNewQuery is called once the URL parameters have been parsed
function runNewQuery(queryString, values) {
    // call the query module with querystring and then html parse the results
    console.log("querying DB ...");
    dbquery(queryString, values, function (err3, queryResults) {
        if (err3) {
            console.log("Error with query ", err3);
            return;
        }
        console.log("good query - " + queryResults.length + " results returned");
        console.log("parsing to html ...");
        htmlparse(queryResults, function (err4, outputString) {
            if (err4) {
                console.log("Error Parsing query to HTML", err4);
                return;
            }
            console.log("good html, writing file ...");
            // htmlString contains the table-formatted query
            fs.writeFile(globalParams.outputFileName, outputString, fileWritten);
        });
    });
}

function serveTable(res) {
    // intercept requests for 'checkFile' and respond with an 'OK' and 'table Updated' content once the table is ready
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    res.end('table Updated');
    console.log(globalParams.checkFile + " dispatched");
}

function getDropBoxPath() {
    fs.readFile(process.env.LOCALAPPDATA + '//Dropbox//info.json', 'utf8', function (err2, pathdata) {
        if (err2) {
            console.log("Error getting Dropbox path", err2);
            return;
        }
        // first, get the path to the local Dropbox folder and change the \ to /
        dropboxPath = "C\:/" + JSON.parse(pathdata).business.path.match(/:\\(.+)/)[1].replace(/\\/g, "/") + "/";
        console.log("Good DropBox Path:", dropboxPath);
        servePatents = serveStatic(dropboxPath); // serve anything with pdf in it from this directory instead
    });
}
// create the server
var server = http.createServer(function (request, response) {
    var done = finalhandler(request, response);
    // the page requests 'globalParams.checkFile' after asking for a new query. Here we capture that
    if (request.url.indexOf(globalParams.checkFile) > -1) {
        console.log(globalParams.checkFile + " requested");
        thisresp = response;
    } else if (request.url.indexOf("pdf") > -1) {
        servePatents(request, response, done);
    } else {
        serve(request, response, done);
    }
    // if the url is mainFileName then we need to parse the query parameters.
    if (request.url.indexOf(globalParams.mainFileName) > -1) {
        queryJSON = require('url').parse(request.url, true).query;
        propertyCheck = Object.keys(queryJSON);
        if (propertyCheck.indexOf("meth") > -1) {
            // the parameter 'meth' is in the string. A proxy for a valid incoming page-with-query
            if (queryJSON.save != "true") {
                savedSearch = ["",[]];
            }
            console.log(queryJSON, savedSearch);
            urlParse(queryJSON, savedSearch[0], savedSearch[1], function (err5, resultString, valueString) {
                if (err5) {
                    console.log("Error parsing url parameters:", queryJSON);
                } else {
                    runNewQuery(resultString, valueString); // now update the results table
                    savedSearch[0] = resultString; // save the last search for posterity
                    savedSearch[1] = valueString; // save the last search for posterity
                }
            }); //urlParse
        } //found 'meth' in the properties
    } //the request is for the mainFileName
}); // createserver
// set up emitters, get Dropbox path, start server
eventEmitter.on('tableReady', serveTable);
getDropBoxPath();
server.listen(8080);
console.log("Server listening at port 8080");
