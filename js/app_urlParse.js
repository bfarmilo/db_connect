module.exports = urlParse;
// converts the incoming parameters and values into a proper WHERE clause
// takes an (array of kvp's (param:value), saved({where: string, paramArray: array,
// callback) as argument and returns a callback (error, SQL-formatted 'WHERE', array of paramters)
const sqlParsed = require('./app_sqlParse');

const parsedUrl = {
  whereString: '',
  srchParams: [],
};

function updateSQL(whereClause, params) {
  parsedUrl.whereString += whereClause;
  parsedUrl.srchParams = params;
}

function urlParse(params, saved, callback) {
  try {
    // currently handles paramaters 'srch, srvl, doc, meth, save'
    // first set up the start - does it begin with WHERE (new search) or AND (saved search) ?
    if (params.save === true && saved.where !== '') {
      parsedUrl.whereString = `${saved.where}  AND (`;
    } else {
      parsedUrl.whereString = 'WHERE (';
    }
    if (params.srch !== '') {
      // has a search we need to parse for the query
      sqlParsed(params.srch, params.save, saved.paramArray.length=0, params.srvl, (error, where, parameters) => {
        if (error) throw error;
        updateSQL(where, parameters);
      });
    }
    // no search field, both 'documented' and 'method claims' are false
    if (params.srch === '' && params.doc === false && params.meth === false) {
      parsedUrl.whereString += 'claims.ClaimNumber = 1'; // set default where
    }
    if (params.doc !== false) {
      parsedUrl.srchParams.push(1);
      updateSQL(` AND claims.IsDocumented = @${parsedUrl.srchParams.length - 1}`, parsedUrl.srchParams);
    }
    if (params.meth !== false) {
      parsedUrl.srchParams.push(0);
      updateSQL(` AND claims.IsMethodClaim = @${parsedUrl.srchParams.length - 1}`, parsedUrl.srchParams);
    }
    parsedUrl.whereString += ')';
    parsedUrl.srchParams = saved.paramArray.concat(parsedUrl.srchParams);
    // console.log(whereString, srchParams);
    return callback(null, parsedUrl.whereString, parsedUrl.srchParams);
  } catch (err) {
    return callback(err);
  }
}
