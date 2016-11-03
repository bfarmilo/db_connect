module.exports = runNewQuery;

const dbquery = require('./app_DBconnect');
const htmlparse = require('./app_htmlparsetempl');

function runNewQuery(queryType, queryString, values, callback) {
    // call the query module with querystring and then html parse the results
    // console.log("querying DB ...");
    dbquery(queryType, queryString, values, function (err3, queryResults) {
        if (err3) {
            // console.log("Query Error", "Error with query "+err3);
            return callback(err3);
        }
        if (queryResults != 'connect') {
        // console.log("good query - " + queryResults.length + " results returned");
        return callback(null, queryResults);
      }
    });
}
