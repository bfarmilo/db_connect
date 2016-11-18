module.exports = query;
// takes arguments (WHEREstring, VALUESarray, callback),
// returns callback(error, array containing query results)
const sql = require('msnodesqlv8');
const DB = require('./app_config.json').patentDB;
// the main query code
function query(qryType, whereString, values, callback) {
  // open a connection to the database
  sql.open(DB.connection, (err, conn) => {
    if (err) return callback(err);
    // good connection, so query the DB and return the callback when done
    const sqlString = `${DB[qryType]}${whereString}${(qryType === 'p_SELECT' || qryType === 'm_MARKMANALL') ? DB.orderString : ''}`;
    conn.queryRaw(sqlString, values, (err2, data) => {
      if (err2) return callback(err2);
      if (qryType === 'u_UPDATE') return callback(null, 'updated');
      return callback(null, data.rows);
    }); // queryRaw
  }); // connection to DB
} // the query code
