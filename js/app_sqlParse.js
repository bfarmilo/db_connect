/*jslint
     node: true
     es6: true
*/
module.exports = sqlParse;
//takes (field, searchstring, callback) as arguments and returns a callback (error, where string, array of paramaters)
var pat = require('./app_config.json').urlParams; //stores the whereObj and regEx
var paramAry = [];
var matchExp = new RegExp(pat.reg, "g");

function sqlParse(searchField, searchString, callback) {
    try {
        // searchString is of the form word1 OR word2 AND word3
        // could also be word1 OR NOT word2 AND NOT word3
        paramAry = [];
        // first the easy case -- there is only one value and no and/or logic
        if (searchString.search(matchExp) === -1) {
            if (searchString.search("NOT") === -1) {
                //doesn't contain NOT
                paramAry.push('%' + searchString + '%');
                searchString = pat.whereObj[searchField] + " LIKE ?";
            } else {
                //strip out 'NOT' from the parameter
                paramAry.push('%' + searchString.replace("NOT ", "") + '%');
                searchString = pat.whereObj[searchField] + " NOT LIKE ?";
            }
        } else {
            // has at least one AND or OR
            paramAry = searchString.split(matchExp);
            paramAry.forEach(function (values, index, theArray) {
                if (values.search("NOT") === -1) {
                    //doesn't contain NOT
                    theArray[index] = '%' + values + '%';
                    searchString = searchString.replace(values, pat.whereObj[searchField] + " LIKE ?");
                } else {
                    //strip out 'NOT' from the parameter
                    //add the percents
                    theArray[index] = "%" + values.replace("NOT ", "") + "%";
                    //replace the search terms with the generic SQL [column] NOT lIKE ? but leave the OR and AND
                    searchString = searchString.replace(values, pat.whereObj[searchField] + " NOT LIKE ?");
                }
            });
        }
        return callback(null, searchString, paramAry);
    } catch (err) {
        return callback(err);
    }
}
