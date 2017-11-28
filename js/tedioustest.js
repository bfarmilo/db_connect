// takes arguments (WHEREstring, VALUESarray, callback),
// returns callback(error, array containing query results)
const query = require('./app_DBconnect');
// the main query code
// open a connection to the database
query('p_SELECT', 'WHERE patents.PMCRef LIKE @0', ['%ASRE%'], (err, dat) => {
    if (err) {
        console.error(err)
    } else {
        console.log('found result \n%j', dat);
    }
})
