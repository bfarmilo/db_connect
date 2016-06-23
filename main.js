const electron = require('electron');
// Module to control application life.
const {app} = electron;
// Module to create native browser window.
const {BrowserWindow} = electron;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({width: 1400, height: 800});

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
var fs = require('fs');
var sql = require('msnodesqlv8');
// 'http'
// 'finalhandler'
// 'serve-static'
// 'url'
// 'fs'
// 'msnodesqlv8'
// 'events'
var events = require('events');
var eventEmitter = new events.EventEmitter();


// database variables
const conn_str = "Driver={SQL Server Native Client 11.0};Server={(LocalDB)\\v11.0};Database=C\:\\PMC-Project\\Server\\bin\\PMC_LicensingDB1.mdf;Integrated Security=True; Connect Timeout=150;MultipleActiveResultSets=True;App=EntityFramework;"; //connection to localDB
const whereObj = {"Cl":"claims.ClaimHtml", "Po":"claims.PotentialApplication", "Wa":"claims.WatchItems", "Pa":"RIGHT(CAST(patents.PatentNumber As char(7)),3)", "PM":"patents.PMCRef"};
var selectString = "SELECT TOP 100 patents.PMCRef, patents.PatentPath, patents.PatentNumber, claims.ClaimNumber, claims.ClaimHtml, claims.PotentialApplication, claims.WatchItems FROM Claim claims INNER JOIN Patent patents ON patents.PatentID = claims.PatentID "; //A table with patent number, pmc ref and claims
var whereString = ""; //used to compose the WHERE clause
const orderString = " ORDER BY patents.PatentNumber, claims.ClaimNumber ASC";
var valString = [];


//html output variables
const mainFileName = "index.html";
const outputFileName = "resultTable.html"; //the file we are writing to
const headerString = "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/><meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />	<!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags --><title>Query Results</title><link rel=\"stylesheet\" href=\"css/querystyle.css\" /><!-- Bootstrap --><link href=\"css/bootstrap.min.css\" rel=\"stylesheet\" />	<!-- jQuery (necessary for Bootstrap's JavaScript plugins) --><script src=\"js/jquery-2.2.3.js\"></script>	<!-- Include all compiled plugins (below), or include individual files as needed --><script src=\"js/bootstrap.min.js\"></script></head><body><table class=\"table-striped table-fixed table-bordered\"><tbody>"; // the same header for the file each time
const endString = "</tbody></table></body></html>"; //closes out the header
var outputString = ""; // keeps track of the body of the table

var dropboxPath = ""; // keeps the path to the local dropbox

const relPath = "../../../../../../" //hack to make the patent links work

// before we hit the database, let's make the full Dropbox pathname
function RunNewQuery() {
  outputString = ""; // initialize the new table
  fs.readFile(process.env.LOCALAPPDATA + '//Dropbox//info.json', 'utf8', gotPath);
  // need to pass selectString, whereString, valString to 'gotPath'
  // thisresp has to flow through also
}

// callback once we have the dropbox path
function gotPath(err1, pathdata) {
  if (err1) {
    console.log("Error getting Dropbox path", err1);
    return;
  };

  // first, get the path to the local Dropbox folder and change the \ to /
  dropboxPath = relPath + JSON.parse(pathdata).business.path.match(/:\\(.+)/)[1].replace(/\\/g, "/") + "/";
  console.log ("Good DropBox Path:", dropboxPath);
  // open a connection to the database
  sql.open(conn_str, function (err, conn) {
    if (err) {
      console.log("Error opening the connection!");
      return;
    }
    console.log ("Good connection to:", conn_str.slice(conn_str.indexOf("Server="), conn_str.indexOf(";Integrated")));
    // good connection, so query the DB and call 'QueryResults' when done
    console.log ("Attempting Query: "+selectString + whereString + orderString, valString);
    conn.queryRaw(selectString + whereString + orderString, valString, QueryResults);
    // nothing more to pass !
    valString = [];
  }); // connection to DB
}; //the gotPath callback

// called when we have a good DB connection
function QueryResults(err, results) {
  if (err) {
    console.log("Error running query!", err);
    return;
  }
  console.log ("Query Successful");

  // iterate through the rows that the query returns
  outputString = "<div id=\"numResults\" data-num=\""+results.rows.length.toString()+"\"> </div>"

  for (var i = 0; i < results.rows.length; i++) {
    //start with a new row tag
    outputString += "<tr>";
    var colClass = "col-md-1 col-lg-1"; //set an initial value for the column class
    //go though each column returned in the current row
    results.rows[i].forEach(function addColtags(val, idx) {
      if (idx == 4) {
        colClass = "col-md-7 col-lg-7"; //claim needs a wider box
      } else {
        colClass = "col-md-1 col-lg-1";
      }
      if (idx !== 2)
        outputString += "<td class=\"col" + (idx + 1) + " " + colClass + "\">"; //put in the opening <td> tag, except for the patent column
      // idx 1 is the patent path
      if (idx == 1) {
        if (val) {
          // not all patents have a URL in the database
          val = val.replace(/\\/g, "/"); //convert back slash to slash
          outputString += "<a href=\"" + encodeURI(dropboxPath + val) + "\" target=\"_blank\">"; //for the patent path, bury it an <a> tag
        } else {
          outputString += "<a href=#>";
        }
      } else {
        outputString += val; // insert the value into the cell
        if (idx == 2)
          outputString += "</a>"; //for the patent number close the <a> tag
        outputString += "</td>"; //in any case close the <td> tag
      } // if-then-else
    }); // forEach, ie end of the row
    outputString += "</tr>";
  }; // for loop, ie, time for a new row

  fs.writeFile(outputFileName, headerString + outputString + endString, FileWritten);
  // need to pass 'thisresp' to FileWritten
}; // the QueryResults callback

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

var thisresp = {}; // tracks the response object for the 'tableReady' checker. Better to pass through the callbacks


function serveTable (res) {
  // intercept requests for 'tableReadyCheck' and respond with an 'OK' and 'table Updated' content once the table is ready
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('table Updated')
}

eventEmitter.on('tableReady', serveTable);

// create the server
var server = http.createServer(function (request, response) {
  var done = finalhandler(request, response);

  // the page requests 'tableReadycheck' after asking for a new query. Here we capture that
  if (request.url.indexOf("tableReadycheck") > -1 ) {
    thisresp = response;
  } else {
    serve(request, response, done);
  };

  // if the url is output.html then we need to parse the query parameters.

  if (request.url.indexOf(mainFileName) > -1 ) {

    queryJSON = require('url').parse(request.url, true).query;
    var propertyCheck = Object.keys(queryJSON);


    if (propertyCheck.indexOf("meth") > -1) {
      // the parameter 'meth' is in the string.
      whereString = ""; //default - pull claim 1

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
    RunNewQuery(); //pass: selectString, whereString, valString, thisresp
  }; //if the pathname is output.html
}); // createserver

//.start listening
server.listen(8080);
console.log("Server listening at port 8080");
