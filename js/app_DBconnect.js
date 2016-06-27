module.exports = query;
// takes arguments (WHEREstring, VALUESarray, callback), returns callback(error, array containing query results)


var sql = require('msnodesqlv8');


// database variables
const conn_str = "Driver={SQL Server Native Client 11.0};Server={(LocalDB)\\v11.0};Database=C\:\\PMC-Project\\Server\\bin\\PMC_LicensingDB1.mdf;Integrated Security=True; Connect Timeout=150;MultipleActiveResultSets=True;App=EntityFramework;"; //connection to localDB
var selectString = "SELECT TOP 100 patents.PMCRef, patents.PatentPath, patents.PatentNumber, claims.ClaimNumber, claims.ClaimHtml, claims.PotentialApplication, claims.WatchItems FROM Claim claims INNER JOIN Patent patents ON patents.PatentID = claims.PatentID "; //A table with patent number, pmc ref and claims
const orderString = " ORDER BY patents.PatentNumber, claims.ClaimNumber ASC"; // ordered by patent number then claims (always)



// the main query code
function query(whereString, values, callback) {
  // open a connection to the database
  sql.open(conn_str, function (err, conn) {
    if (err) {
      console.log("Error opening the connection!");
      return callback(err);
    }
    console.log ("Good connection to:", conn_str.slice(conn_str.indexOf("Server="), conn_str.indexOf(";Integrated")));
    // good connection, so query the DB and return the callback when done
    console.log ("Attempting Query: "+selectString + whereString + orderString, values);
    conn.queryRaw(selectString + whereString + orderString, values, function(err2, data){
      if (err2) {
        console.log("Error with the Query!", selectString + whereString + orderString, values);
        return callback(err2);
      } else {
        return callback(null, data.rows);
      };
    }); //queryRaw
  }); // connection to DB
}; // the query code



