/*jslint
     node: true
     es6: true
*/
module.exports = urlParse;
//converts the incoming parameters and values into a proper WHERE clause

//takes an (array of kvp's (param:value), savedWhere(string), savedParams(array), callback) as argument and returns a callback (error, SQL-formatted 'WHERE', array of paramters)
var pat = require('./app_config.json').urlParams; //stores the whereObj and regEx
var sqlParsed = require('./app_sqlParse');
var whereString = "";
var srchParams = [];

function updateSQL(error, whereClause, params) {
    if (error) {
        console.log("error parsing SQL command !", error);
    } else {
        // console.log("parsed to "+whereClause+": "+params);
        whereString += whereClause;
        srchParams = params;
    }
}

function urlParse(params, savedWhere, savedParams, callback) {
    try {
        // the parameter 'meth' is in the string. A proxy for a valid incoming page-with-query
        // currently handles paramaters 'srch, srvl, doc, meth, save'
        // TODO: Where clause construction better handled with templates most probably
        if (savedWhere != "") {
            whereString = savedWhere + " AND (";
        } else {
            whereString = "WHERE (";
        }
        if (params.srch !== '' && params.srvl !== '') {
            // has a search and searchval we need to parse for the query
            sqlParsed(params.srch, params.srvl, updateSQL);
        } else {
            // no search parameters provided
            if (params.doc === false && params.meth === false) {
                whereString += "claims.ClaimNumber = 1"; //nothing selected -- just pull claim 1
            }
        }
        if (params.doc !== false) {
            srchParams.push(1);
            updateSQL(null, ' AND claims.IsDocumented = ?', srchParams);
        }
        if (params.meth !== false) {
            srchParams.push(0);
            updateSQL(null, ' AND claims.IsMethodClaim = ?', srchParams);
        }
        whereString += ")";
        srchParams = savedParams.concat(srchParams);
        // console.log(whereString, srchParams);
        return callback(null, whereString, srchParams);
    } catch (err) {
        return callback(err);
    }
}
