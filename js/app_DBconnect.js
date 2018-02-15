module.exports = query;
// takes arguments (WHEREstring, VALUESarray, callback),
// returns callback(error, array containing query results)
const { Connection, Request, TYPES } = require('tedious');
const DB = require('./app_config.json').patentDB;
// the main query code
function query(connectParams, qryType, whereString, values, callback) {
  let returnResults = [];
  // open a connection to the database
  const connection = new Connection(connectParams);
  connection.on('connect', err => {
    if (err) return callback(err);
    // good connection, so query the DB and return the callback when done
    const sqlString = `${DB[qryType]}${whereString}${(qryType === 'p_SELECT' || qryType === 'm_MARKMANALL') ? DB.orderString : ''}`;
    console.log('querying with SQL: %s\n Params:', sqlString, values);
    const request = new Request(sqlString, (err, rowCount, rows) => {
      if (err) return callback(err);
      console.log('%d rows returned', rowCount);
      connection.close();
      if (qryType === 'u_UPDATE') return callback(null, 'updated');
      return callback(null, returnResults);
    });
    const expandVals = values.length > 0 ? values.map((item, idx) => {
      request.addParameter(`${idx}`, TYPES.VarChar, `${item}`);
      return;
    }) : 'no params';
    request.on('row', (data) => {
      if (qryType !== 'u_UPDATE') {
        returnResults.push(data.map(item => item.value))
      };
      return;
    });
    connection.execSql(request);
  });// connection to DB
} // the query code
