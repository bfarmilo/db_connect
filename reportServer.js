// npm modules needed
var fs = require('fs');
var sql = require('node-sqlserver-unofficial');
// 'http'
// 'finalhandler'
// 'serve-static'
// 'url'
// 'fs'
// 'node-sqlserver-unofficial'

// database variables
const conn_str = "Driver={SQL Server Native Client 11.0};Server={(LocalDB)\\v11.0};Database=C\:\\PMC-Project\\Server\\bin\\PMC_LicensingDB1.mdf;Integrated Security=True; Connect Timeout=150;MultipleActiveResultSets=True;App=EntityFramework;"; //connection to localDB
const whereObj = {"Cl":"claims.ClaimHtml", "Po":"claims.PotentialApplication", "Wa":"claims.WatchItems", "Pa":"RIGHT(CAST(patents.PatentNumber As char(7)),3)"};
var selectString = "SELECT TOP 100 patents.PMCRef, patents.PatentPath, patents.PatentNumber, claims.ClaimNumber, claims.ClaimHtml, claims.PotentialApplication, claims.WatchItems FROM Claim claims INNER JOIN Patent patents ON patents.PatentID = claims.PatentID "; //A table with patent number, pmc ref and claims
var whereString = ""; //used to compose the WHERE clause
const orderString = " ORDER BY patents.PatentNumber, claims.ClaimNumber ASC";

//html output variables
const outputFileName = "resultTable.html"; //the file we are writing to
const headerString = "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/><meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />	<!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags --><title>Query Results</title><link rel=\"stylesheet\" href=\"css/querystyle.css\" /><!-- Bootstrap --><link href=\"css/bootstrap.min.css\" rel=\"stylesheet\" />	<!-- jQuery (necessary for Bootstrap's JavaScript plugins) --><script src=\"js/jquery-2.2.3.js\"></script>	<!-- Include all compiled plugins (below), or include individual files as needed --><script src=\"js/bootstrap.min.js\"></script><!--<script> $(function(){ $(\"#includeFile\").load(\"testOutput.html\")})</script>--></head><body><table class=\"table-striped table-fixed table-bordered\"><tbody>"; // the same header for the file each time
const endString = "</tbody></table></body></html>"; //closes out the header
var outputString = ""; // keeps track of the body of the table

var dropboxPath = ""; // keeps the path to the local dropbox

const relPath = "../../../../../../" //hack to make the patent links work

// before we hit the database, let's make the full Dropbox pathname
function RunNewQuery() {
	outputString = ""; // initialize the new table
	fs.readFile(process.env.APPDATA + '//Dropbox//info.json', 'utf8', gotPath);
}

// callback once we have the dropbox path
function gotPath(err1, pathdata) {
	if (err1) {
		console.log("Error getting Dropbox path");
		return;
	};

	// strip off c:
	
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
		console.log ("Attempting Query: "+selectString + whereString + orderString);
		conn.queryRaw(selectString + whereString + orderString, QueryResults);
	}); // connection to DB
}; //the gotPath callback

// called when we have a good DB connection
function QueryResults(err, results) {
	if (err) {
		console.log("Error running query!", err);
		return;
	}
	console.log ("Query Successful");
	// console.log (results);
	// iterate through the rows that the query returns
	if (results.rows.length == 0) {
		outputString = "<tr class=\"warning\"><td class=\"col-md-10\">No Claims match the current query</td></tr>"
	}
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

	//now to clean up outputString (not needed in current implemenation) 
	// remove all newlines
	// outputString = outputString.replace(/\n/g, " ");
	// replace ' with \', ie escape any single quotes in the claim text
	// outputString = outputString.replace(/'/g, "\\'");
	// now write it to our testOutput.js file inclosed in a document.write command
	//fs.writeFile(outputFileName, "document.write ('" + outputString + "')", FileWritten);
	
	fs.writeFile(outputFileName, headerString + outputString + endString, FileWritten);
}; // the QueryResults callback

// called once the file is written !
function FileWritten(err) {
	if (err) {
		console.log("error with writing file");
		return;
	}
	// otherwise all fine
	console.log ("File successfully written:", outputFileName);
}; // The FileWritten callback

// server variables

var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var queryJSON = {};
var serve = serveStatic("./");



// create the server
var server = http.createServer(function (request, response) {
	var done = finalhandler(request, response);
	//this can probably be done with listeners ?
	serve(request, response, done);
	// SHOULD ONLY SEND RESPONSE ONCE THE RunNewQuery is COMPLETE
	queryJSON = require('url').parse(request.url, true).query;
	var propertyCheck = Object.keys(queryJSON);
	console.log(request.url, queryJSON, queryJSON.srch, queryJSON.srvl);
	console.log(propertyCheck.indexOf("meth"));

	if (propertyCheck.indexOf("meth") > -1) {
		whereString = ""; //default - pull claim 1
		if (queryJSON.srch !=='' && queryJSON.srvl !== '') {
			whereString = "WHERE "+ whereObj[queryJSON.srch] + " LIKE '%" + queryJSON.srvl + "%'"
			if (queryJSON.doc !== 'false') whereString += " AND claims.IsDocumented = 1";
		    if (queryJSON.meth !== 'false') whereString += " AND claims.IsMethodClaim = 0";
		} else {
			whereString = "WHERE ";
			if (queryJSON.doc == 'false' && queryJSON.meth == 'false') whereString += "claims.ClaimNumber = 1"; //nothing selected -- just pull claim 1
			if (queryJSON.doc !== 'false') whereString += "claims.IsDocumented = 1";
		    if (queryJSON.meth !== 'false') whereString += " AND claims.IsMethodClaim = 0";
		}; // first if
		console.log(queryJSON.srch, queryJSON.srvl, queryJSON.doc, queryJSON.meth);
		console.log(whereString);
		RunNewQuery();
	}; //if the pathname is output.html
	
}); // createserver

//.start listening
server.listen(8080);
console.log("Server listening at port 8080");
