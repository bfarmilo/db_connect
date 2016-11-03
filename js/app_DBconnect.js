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
            //console.log("Error opening the connection!", DB.connection);
            return callback(err);
        }
        //console.log("Good connection to:", DB.connection.slice(DB.connection.indexOf("Server="), DB.connection.indexOf(";Integrated")));
        // good connection, so query the DB and return the callback when done
        //console.log(DB[qryType], qryType[0]);
        if(qryType[0]==="p") {
          whereString += DB.orderString;
        }

        sqlString = DB[qryType] + whereString;

        // if 'null' is passed to whereString we skip a query
        //console.log("Attempting Query: " + sqlString, values);
        conn.queryRaw(sqlString, values, function (err2, data) {
            if (err2) {
                //console.log("Error with the Query!", DB.selectString + whereString, values);
                return callback(err2);
            } else {
              if (qryType !== "p_UPDATE") {
                return callback(null, data.rows);
              } else {
                return callback(null, 'updated');
              }
            };
        }); //queryRaw
    }); // connection to DB
}; // the query code
