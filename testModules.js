var events = require('events');
var fs = require('fs');

var query = require('./js/app_DBconnect');
var htmlparse = require ('./js/app_htmlparse');

var eventEmitter = new events.EventEmitter();

function RunNewQuery(queryString, values) {
  // call the query module with querystring and then html parse the results
  console.log("querying DB ...");
  query(queryString, values, function (err3, queryResults){
    if (err3) {
      console.log("Error with query ", err3);
      return;
    }
    console.log("good query - "+queryResults.length+" results returned");
    console.log("parsing to html ...");
    htmlparse(queryResults, function(err4, outputString){
      if (err4) {
        console.log("Error Parsing query to HTML", err4);
        return;
      }
      console.log("good html, writing file ...");
      // htmlString contains the table-formatted query
      fs.writeFile(outputFileName, outputString, FileWritten);
    });
  });
}


// called once the file is written !
function FileWritten(err) {
  if (err) {
    console.log("error with writing file");
    return;
  }
  // otherwise all fine
  // emit the 'table Ready' event which is handled by the serveTable callback
  // thisresp doesn't have a value until 'tableReadyCheck' is requested
  if (Object.keys(thisresp).indexOf("finished") > -1) {
    eventEmitter.emit('tableReady', thisresp);
    thisresp =  {};
  }
  console.log ("File successfully written:", outputFileName);
}; // The FileWritten callback

// server variables

var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var queryJSON = {};
var serve = serveStatic("./");
var servePatents = serveStatic("./"); // just instantiate this for now, will replace with the dropbox path once we have it

var thisresp = {}; // tracks the response object for the 'tableReady' checker.

// query lookups
const whereObj = {
  "Cl":"claims.ClaimHtml",
  "Po":"claims.PotentialApplication",
  "Wa":"claims.WatchItems",
  "Pa":"RIGHT(CAST(patents.PatentNumber As char(7)),3)",
  "PM":"patents.PMCRef"
};

var whereString = "";
var valString = [];

// file lookups
var dropboxPath = ""; // keeps the path to the local dropbox
const mainFileName = "index.html"; //the host file
const outputFileName = "resultTable.html"; //the file we are writing to


function serveTable (res) {
  // intercept requests for 'tableReadyCheck' and respond with an 'OK' and 'table Updated' content once the table is ready
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('table Updated')
}

function getDropBoxPath() {
  fs.readFile(process.env.LOCALAPPDATA + '//Dropbox//info.json', 'utf8', function(err2, pathdata) {
    if (err2) {
      console.log("Error getting Dropbox path", err1);
      return;
    };
    // first, get the path to the local Dropbox folder and change the \ to /
    dropboxPath = "C\:/" + JSON.parse(pathdata).business.path.match(/:\\(.+)/)[1].replace(/\\/g, "/") + "/";
    console.log ("Good DropBox Path:", dropboxPath);
    servePatents = serveStatic(dropboxPath); // serve anything with pdf in it from this directory instead
  });
}


// create the server
var server = http.createServer(function (request, response) {
  var done = finalhandler(request, response);

  // the page requests 'tableReadycheck' after asking for a new query. Here we capture that
  if (request.url.indexOf("tableReadycheck") > -1 ) {
    thisresp = response;
  } else if (request.url.indexOf("pdf") > -1) {
    servePatents (request, response, done);
  } else {
    serve(request, response, done);
  };

  // if the url is mainFileName then we need to parse the query parameters.

  if (request.url.indexOf(mainFileName) > -1 ) {

    queryJSON = require('url').parse(request.url, true).query;
    var propertyCheck = Object.keys(queryJSON);


    if (propertyCheck.indexOf("meth") > -1) {
      // the parameter 'meth' is in the string.
      whereString = ""; //default - pull claim 1
      valString=[]; //reset valString

      if (queryJSON.srch !=='' && queryJSON.srvl !== '') {
        // has a search and searchval we need to parse for the query

        // need to parse the " OR " as ","
        queryJSON.srvl = queryJSON.srvl.replace(/ OR /g, ",");
        // parse " AND " as "+"
        queryJSON.srvl = queryJSON.srvl.replace(/ AND /g, "+");

        // set up the default whereString
        whereString = "WHERE "+ whereObj[queryJSON.srch] + " LIKE ? ";

        var lastIdx = 0;

        //iterate through the string a character at a time
        for (var i=0; i < queryJSON.srvl.length; i++) {
          if (queryJSON.srvl[i] == ",") {
            whereString += "OR "+whereObj[queryJSON.srch]+" LIKE ? ";
            valString.push("%"+queryJSON.srvl.slice(lastIdx,i)+"%");
            lastIdx = i+1;
          } else if (queryJSON.srvl[i] == "+") {
            whereString += "AND "+whereObj[queryJSON.srch]+" LIKE ? ";
            valString.push("%"+queryJSON.srvl.slice(lastIdx,i)+"%");
            lastIdx=i+1;
          };
        };

        // the last element, or only element in the case of no AND or OR
        valString.push("%"+queryJSON.srvl.slice(lastIdx)+"%");

        console.log(valString);

        if (queryJSON.doc !== 'false') {
          whereString += " AND claims.IsDocumented = ?";
          valString.push(1);
        };
        if (queryJSON.meth !== 'false') {
          whereString += " AND claims.IsMethodClaim = ?";
          valString.push(0);
        };

      } else {
        whereString = "WHERE ";
        if (queryJSON.doc == 'false' && queryJSON.meth == 'false') {
          whereString += "claims.ClaimNumber = 1"; //nothing selected -- just pull claim 1
        };
        if (queryJSON.doc !== 'false') {
          whereString += "claims.IsDocumented = ?";
          valString = [1];
        };
        if (queryJSON.meth !== 'false') {
          whereString += " AND claims.IsMethodClaim = ?";
          valString = [0];
        };
      }; // the parameters aren't blank
    }; // if 'meth' is in the query parameter
    RunNewQuery(whereString, valString); // now update the results table
  };
}); // createserver

// set up emitters, get Dropbox path, start server
eventEmitter.on('tableReady', serveTable);
getDropBoxPath();
server.listen(8080);
console.log("Server listening at port 8080");
