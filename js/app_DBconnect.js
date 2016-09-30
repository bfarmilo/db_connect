module.exports = query;
// takes arguments (WHEREstring, VALUESarray, callback), returns callback(error, array containing query results)
var sql = require('msnodesqlv8');
var DB = require('./app_config.json').patentDB;
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
          // if 'null' is passed to whereString we skip a query
          console.log("Attempting Query: " + DB.selectString + whereString + DB.orderString, values);
          conn.queryRaw(DB.selectString + whereString + DB.orderString, values, function (err2, data) {
              if (err2) {
                  console.log("Error with the Query!", DB.selectString + whereString + DB.orderString, values);
                  return callback(err2);
              } else {
                  return callback(null, data.rows);
              };
          }); //queryRaw
        }

        if (qryType === "TEST") {
          return callback(null, 'connect');
        }

        if (qryType === "UPDATE") {
          console.log("Attempting Query: "+ DB.updateString + whereString, values);
          conn.queryRaw(DB.updateString + whereString, values, function (err3, data2) {
            if (err3) {
              console.log("Error with the Query!", DB.updateString+whereString, values);
              return callback(err3);
            } else {
              return callback(null, 'updated');
            }
          });
        }
    }); // connection to DB
}; // the query code
