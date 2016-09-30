module.exports = query;
// takes arguments (WHEREstring, VALUESarray, callback), returns callback(error, array containing query results)
var sql = require('msnodesqlv8');
var DB = require('./app_config.json').patentDB;
// the main query code
function query(whereString, values, callback) {
    // open a connection to the database
    sql.open(DB.connection, function (err, conn) {
        if (err) {
            console.log("Error opening the connection!", DB.connection);
            return callback(err);
        }
        console.log("Good connection to:", DB.connection.slice(DB.connection.indexOf("Server="), DB.connection.indexOf(";Integrated")));
        // good connection, so query the DB and return the callback when done
        console.log("Attempting Query: " + DB.selectString + whereString + DB.orderString, values);
        conn.queryRaw(DB.selectString + whereString + DB.orderString, values, function (err2, data) {
            if (err2) {
                console.log("Error with the Query!", DB.selectString + whereString + DB.orderString, values);
                return callback(err2);
            } else {
                return callback(null, data.rows);
            };
        }); //queryRaw
    }); // connection to DB
}; // the query code
