// a node file that reads the contents of an exhibits directory
// and produces a well-formed ???_References.js file

var fs = require('fs');

//user provides the patent number (3 digits) directory as argument 1, and the Exhibits directory as arg 2

//format of the JSON data:
// _typeofdoc_ 	-> dir, category -> doctype, title, (offset)
// then the code that inserts the proper js and css references.

// create a ???_References.js file


// create a template Priviliged_??? Petition_BF.html file