/*jslint
  node: true
*/
var sqlParse = require('./js/app_sqlParse');
var pattern = require('./js/app_config.json').urlParams.pattern;
//test case for string match
var testval1 = {
    "srch": "Po",
    "srvl": ""
};
var testval2 = ["word1", "word2", "word3", "word1,word2", "word1+word2", "word1,word2+word3", "word1+word2,word3", "!word1", "word1,!word2,!word3+!word4"];
var expected2 = ["word1", "word2", "word3", "word1%20OR%20word2", "word1%20AND%20word2", "word1%20OR%20word2%20AND%20word3", "word1%20AND%20word2%20OR%20word3", "NOT%20word1", "word1%20OR%20NOT%20word2%20OR%20NOT%20word3%20AND%20NOT%20word4"];
var expectedSQL = ['claims.PotentialApplication LIKE ?', 'claims.PotentialApplication LIKE ?', 'claims.PotentialApplication LIKE ?', 'claims.PotentialApplication LIKE ? OR claims.PotentialApplication LIKE ?', 'claims.PotentialApplication LIKE ? AND claims.PotentialApplication LIKE ?', 'claims.PotentialApplication LIKE ? OR claims.PotentialApplication LIKE ? AND claims.PotentialApplication LIKE ?', 'claims.PotentialApplication LIKE ? AND claims.PotentialApplication LIKE ? OR claims.PotentialApplication LIKE ?', 'claims.PotentialApplication NOT LIKE ?', 'claims.PotentialApplication LIKE ? OR claims.PotentialApplication NOT LIKE ? OR claims.PotentialApplication NOT LIKE ? AND claims.PotentialApplication NOT LIKE ?'];
var expectedParam = [
    ['%word1%'],
    ['%word2%'],
    ['%word3%'],
    ['%word1%', '%word2%'],
    ['%word1%', '%word2%'],
    ['%word1%', '%word2%', '%word3%'],
    ['%word1%', '%word2%', '%word3%'],
    ['%word1%'],
    ['%word1%', '%word2%', '%word3%', '%word4%']
];
// helper function to check for equality in arrays
function arraysEqual(a, b) {
    "use strict";
    if (a === b) {
        return true;
    }
    if (a === null || b === null) {
        return false;
    }
    if (a.length !== b.length) {
        return false;
    }
    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    a.forEach(function (value, index) {
        if (value !== b[index]) {
            return false;
        }
    });
    return true;
}
//the function under test. Takes a string (serachContent), a matchVal array of operators (.rexp and .str at least), and a isURI flag (true - return URI encoded)
function parseSearch(searchContent, matchVal, isURI) {
    "use strict";
    var reParsed = searchContent;
    matchVal.forEach(function (values) {
        reParsed = reParsed.replace(new RegExp(values.rexp, "g"), (isURI ? encodeURIComponent(values.str) : values.str));
    });
    return reParsed;
}
// Should take "srchfield=word1,word2" and return srchfield LIKE ? OR srchfield LIKE ? and ['%word1%', '%word2%']
testval2.forEach(function (values, index) {
    "use strict";
    //test the URI encoded parsing
    if (parseSearch(values, pattern, true) === expected2[index]) {
        console.log(values, "pass: URI encode");
    } else {
        console.log("fail: wanted ", parseSearch(values, pattern, true), " got ", expected2[index]);
    }
    // test the SQL parsing
    sqlParse(testval1.srch, parseSearch(values, pattern, false), function (err, results1, results2) {
        console.log(err ? "fail parse with error" : "");
        if (results1 === expectedSQL[index]) {
            console.log(results1, "pass: SQL");
        } else {
            console.log("fail: wanted ", expectedSQL[index], " got ", results1);
        }
        if (arraysEqual(results2, expectedParam[index])) {
            console.log(results2, "pass: Params");
        } else {
            console.log("fail: wanted ", expectedParam[index], " got ", results2);
        }
    });
});
