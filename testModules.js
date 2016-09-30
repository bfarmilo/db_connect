/*jslint
     node: true
     es6: true
*/
"use strict";
// query and file writing variables
var events = require('events');
var fs = require('fs');
var dbquery = require('./js/app_DBconnect');
var htmlparse = require('./js/app_htmlparse');
var sqlParsed = require('./js/app_sqlParse');
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
var whereString = "";
var valString = [];
var oldwhereString = ""; //used for saved searches
var oldvalString = []; //used for saved searches
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

function updateSQL(error, whereClause, params) {
    if (error) {
        console.log("error parsing SQL command !", error);
    } else {
        whereString += whereClause;
        valString = params;
    }
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
            //TODO: Move this block to a module 'parseURL'
            if (queryJSON.save === "true") {
                if (oldwhereString === "") {
                    //only overwrite the old search if there isn't a saved search already
                    oldwhereString = whereString; //first save the old search
                    oldvalString = valString;
                }
                whereString = " AND (";
            } else {
                oldwhereString = "";
                oldvalString = [];
                whereString = "WHERE (";
            }
            valString = []; //reset valString
            if (queryJSON.srch !== '' && queryJSON.srvl !== '') {
                // has a search and searchval we need to parse for the query
                sqlParsed(queryJSON.srch, queryJSON.srvl, updateSQL);
            } else {
                // no search parameters provided
                if (queryJSON.doc === 'false' && queryJSON.meth === 'false') {
                    whereString += "claims.ClaimNumber = 1"; //nothing selected -- just pull claim 1
                }
            }
            if (queryJSON.doc !== 'false') {
                valString.push(1);
                updateSQL(null, ' AND claims.IsDocumented = ?', valString);
            }
            if (queryJSON.meth !== 'false') {
                valString.push(0);
                updateSQL(null, ' AND claims.IsMethodClaim = ?', valString);
            }
            whereString += ")";
            console.log(oldwhereString, oldvalString);
            console.log(whereString, valString);
            // end of TODO
        } //found 'meth' in the properties
        runNewQuery(oldwhereString + whereString, oldvalString.concat(valString)); // now update the results table
    } //the request is for the mainFileName
}); // createserver
// set up emitters, get Dropbox path, start server
eventEmitter.on('tableReady', serveTable);
getDropBoxPath();
server.listen(8080);
console.log("Server listening at port 8080");
