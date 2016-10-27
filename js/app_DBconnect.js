module.exports = query;
// takes arguments (WHEREstring, VALUESarray, callback), returns callback(error, array containing query results)
var sql = require('msnodesqlv8');
var DB = require('./app_config.json').patentDB;
var sqlString = "";
var returnVal = "";
// the main query code
//TODO: Close connection
function query(qryType, whereString, values, callback) {
    // open a connection to the database
    sql.open(DB.connection, function (err, conn) {
        if (err) {
            console.log("Error opening the connection!", DB.connection);
            return callback(err);
        }
        console.log("Good connection to:", DB.connection.slice(DB.connection.indexOf("Server="), DB.connection.indexOf(";Integrated")));
        // good connection, so query the DB and return the callback when done
        if (qryType === "SELECT") {
          sqlString = DB.selectString + whereString + DB.orderString;
          returnVal = "data"
        }

        if (qryType === "UPDATE") {
          sqlString = DB.updateString + whereString;
          returnVal = "updated";
        }

        if (qryType === "MARKMAN") {
          sqlString = DB.markmanString + whereString + DB.orderString;
          returnVal = "data";
        }

        if (qryType === "TEST") {
          returnVal = "connect";
        }
        // if 'null' is passed to whereString we skip a query
        console.log("Attempting Query: " + sqlString, values);
        conn.queryRaw(sqlString, values, function (err2, data) {
            if (err2) {
                console.log("Error with the Query!", DB.selectString + whereString + DB.orderString, values);
                return callback(err2);
            } else {
              if (returnVal === "data") {
                return callback(null, data.rows);
              } else {
                return callback(null, returnVal);
              }
            };
        }); //queryRaw
    }); // connection to DB
}; // the query code
