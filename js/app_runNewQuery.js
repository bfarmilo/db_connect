module.exports = runNewQuery;
const dbquery = require('./app_DBconnect');
//
function runNewQuery(connectParams, queryType, queryString, values, callback) {
  // call the query module with querystring and then html parse the results
  dbquery(connectParams, queryType, queryString, values, (err3, queryResults) => {
    if (err3) return callback(err3);
    if (queryResults === 'updated') return callback(null, 'updated');
    return callback(null, queryResults);
  });
}
