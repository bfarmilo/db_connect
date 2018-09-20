/* eslint {
     linebreak-style: ["error", "windows"],
     func-names: 0,
     prefer-arrow-callback: 0,
  } */


const { getMarkmanDropdowns, findDocument, insertAndGetID, getClaimDropdown } = require('../jsx/app_bulkUpload');
const connectParams = require('../app_config.json').patentDB.connection;
const { connectDocker } = require('../jsx/connectDocker');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised);

let queryResults;
let documentID;

// tests
describe('Markman Interface', function () {
  before(async function () {
    await connectDocker(connectParams);
    queryResults = await getMarkmanDropdowns(connectParams);
  })
  describe('getMarkmanDropdowns', function () {
    it('gets claim terms dropdowns', function () {
      expect(queryResults).to.haveOwnProperty('claimTerms');
    });
    it('gets clients dropdowns', function () {
      expect(queryResults).to.haveOwnProperty('clients')
    });
    it('gets sector dropdowns', function () {
      expect(queryResults).to.haveOwnProperty('sectors')
    });
  });
  describe('get document ID', function () {
    it('finds a documentID given a path', async function () {
      documentID = await insertAndGetID(
        connectParams,
        'Document',
        { documentPath: 'PMC Public\\Licensing\\Clients\\Zynga\\Trial\\PMC - Claim Construction Memorandum and Order.pdf' },
        'DocumentID',
        { readOnly: true }
      );
      expect(documentID.DocumentID).to.equal(25380);
    });
    it('reports \'not found\' when file isn\'t found', async function () {
      documentID = await insertAndGetID(
        connectParams,
        'Document',
        { documentPath: 'ZZZPMC Public\\Licensing\\Clients\\Zynga\\Trial\\PMC - Claim Construction Memorandum and Order.pdf' },
        'DocumentID',
        { readOnly: true }
      );
      expect(documentID).to.be.a('string');
      expect(documentID).to.equal('not found');
    });
  });
  describe('insert and getID', function () {
    it('inserts a new entry into a table and returns the ID', async function () {
      const newID = await insertAndGetID(connectParams, 'Sector', { SectorName: 'HDTV' }, 'SectorID');
      expect(newID.SectorID).to.be.a('number');
      const newNewID = await insertAndGetID(connectParams, 'Sector', { SectorName: 'HDTV' }, 'SectorID');
      expect(newNewID.type).to.equal('existing');
    })
  });
  describe('getClaimDropdown', function () {
    it('retrieves a claim dropdown given a valid patent number', async function () {
      const dropDown = await getClaimDropdown(connectParams, 58);
      expect(dropDown.claims.size).to.be.greaterThan(1);
    })
    it('retrieves a claim when it isn\'t in the database', async function () {

    })
  })
  /* 

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
   */
});

