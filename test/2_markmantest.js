 /* eslint {
      linebreak-style: ["error", "windows"],
      func-names: 0,
      prefer-arrow-callback: 0,
   } */

 const chai = require('chai');
 const urlParse = require('../js/app_urlParse'); // takes an array of [key:value] and creates a WHERE clause
 const runNewQuery = require('../js/app_runNewQuery');
 const sqlParsed = require('../js/app_sqlParse');

 const expect = chai.expect;
 chai.config.showDiff = true;
 // tests
 describe('Markman Interface', function () {
   describe('Initialize Window', function () {
     this.timeout(5000);
     const queryJSON = {
       srch: 'Po',
       srvl: 'appl',
       doc: false,
       meth: false,
       save: false,
     };
     const svSearch = {
       where: '',
       paramArray: [],
     }; // used for saved searches
     // using the current list
     describe('Creates a properly formed SQL', function () {
       sqlParsed(queryJSON.srch, queryJSON.srvl, function (error, where, params) {
         it('expands Po properly?', function () {
           expect(where).to.match(/claims\.PotentialApplication LIKE \?/);
         });
         it('creates a parameter array', function () {
           expect(params).to.be.a('array');
         });
         it('creates parameters of the form [\'%x%\']', function () {
           params.forEach(function (data) {
             expect(data).to.match(/%.+%/);
           });
         });
       });
     });
     describe('loads an array of patents, claims and claimIDs', function () {
       it('produces a valid SQL query', function (done) {
         // test against meth=true and a multi-search
         queryJSON.srvl = 'appl AND same AND NOT str';
         queryJSON.meth = true;
         urlParse(queryJSON, svSearch, function (err5, where) {
           if (err5) done(err5);
           else {
             expect(where).to.match(/claims\.IsMethodClaim =/);
             expect(where).to.match(/claims\.PotentialApplication LIKE \? AND claims\.PotentialApplication LIKE \? AND claims\.PotentialApplication NOT LIKE \?/);
             done();
           }
         });
         queryJSON.meth = false;
         queryJSON.srvl = 'appl';
       });
       it('gets a Markman Patents & Claims array back from the Query', function (done) {
         urlParse(queryJSON, svSearch, function (err5, whereClause, valueArray) {
           runNewQuery('m_PATENTSCLAIMS', whereClause, valueArray, function (err6, queryResults) {
             if (err6) done(err6);
             else {
               expect(queryResults).to.be.a('array');
               expect(queryResults.length).to.be.at.least(1);
               expect(queryResults[0][1]).to.match(/\d{7}/);
               done();
             }
           });
         });
       });
     });
     describe('loads a list of claim terms and TermID into termsArray', function () {
       it('gets a termArray', function (done) {
         runNewQuery('m_TERMS', '', [], function (err, queryResults) {
           if (err) done(err);
           else {
             expect(queryResults).to.be.a('array');
             expect(queryResults.length).to.be.at.least(1);
             expect(queryResults[0][0]).to.be.a('string');
             done();
           }
         });
       });
     });
     describe('loads a list of constructions and constructID into constructArray', function () {
       it('gets a construction Array', function (done) {
         runNewQuery('m_CONSTRUCT', '', [], function (err, queryResults) {
           if (err) done(err);
           else {
             expect(queryResults).to.be.a('array');
             expect(queryResults.length).to.be.at.least(1);
             expect(queryResults[0][0]).to.be.a('string');
             done();
           }
         });
       });
     });
     describe('it formats and loads the page', function () {
       it('loads a list of claim terms into a drop-down');
       it('loads the patents into another dropdown');
       it('loads the constructions into yet another dropdown');
       it('disables the `UPDATE` button');
     });
   });
   describe('Select Claim Term', function () {
     // when user selects a claim terms
     it('loads the TermID of the selected claim term');
     // load past constructions & Patents, Claims and display on screen
     it('loads a list of past constructions into an array');
     it('deals with a lack of past constructions cleanly');
     // ... user selects a patent / claim
     it('loads the ClaimID of the selected claim');
     // ... user selects a constructions
     it('loads the ConstructID of the selected construction');
     // enable 'update' button
     it('enables the `UPDATE` button when valid selections are made');
     it('disables the `UPDATE` button if a selections is changed to an invalid selection');
   });
   describe('Select Update', function () {
     // when user selects 'update'
     // check to see if patent/claim is selected and construction is connected
     it('prevents duplicates');
     it('warns of over-writing');
     it('creates a properly-formed `UPDATE` statement based on the user selections');
     // update mtc table with TermID, ClaimID, ConstructID
     it('updates the table and reports success');
     // clear values
     it('clears values and updates the past constructions');
     // disable 'update' button
     it('disables the `UPDATE` button');
   });
   describe('Close Window', function () {
     // when user selects 'close window'
     it('warns if update is not applied');
     // confirm if update not applied
     it('smoothly closes connections and processes without memory leaks');
     // close window
   });
 });
