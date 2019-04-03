/* eslint {
     linebreak-style: ["error", "windows"],
     func-names: 0,
     prefer-arrow-callback: 0,
  } */


const { insertAndGetID } = require('../jsx/app_bulkUpload');
const { initializeMarkman,
  lookupIDs,
  getPatents,
  getClaims,
  addMarkman,
  modifyMarkman,
  linkDocument } = require('../jsx/app_markmanInterface');
const connectParams = require('../app_config.json').patentDB.connection;
const { connectDocker } = require('../jsx/connectDocker');
const { getDropBoxPath } = require('../jsx/getDropBoxPath');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised);

let queryResults;
let documentID;
let dropBoxPath;
let patentMap;

// tests
describe('Markman Interface', function () {
  before(async function () {
    await connectDocker(connectParams);
    queryResults = await initializeMarkman(connectParams);
    getDropBoxPath((err, result) => {
      if (err) throw (err);
      dropBoxPath = result;
    })
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
  describe.skip('interfaces with the documents table', function () {
    it('finds a documentID given a path', async function () {
      documentID = await insertAndGetID(
        connectParams,
        'Document',
        { DocumentPath: 'PMC Public\\Licensing\\Clients\\Zynga\\Trial\\PMC - Claim Construction Memorandum and Order.pdf' },
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
    it('browses to a document on the server and returns a documentID', async function () {
      documentID = await linkDocument(connectParams, dropBoxPath, 1);
      expect(documentID).to.not.equal('not found');
    })
  });
  describe.skip('inserts if not existing, updates if necessary', function () {
    it('inserts a new entry into a table and returns the ID', async function () {
      const newID = await insertAndGetID(connectParams, 'Sector', { SectorName: 'HDTV' }, 'SectorID');
      expect(newID.SectorID).to.be.a('number');
      const newNewID = await insertAndGetID(connectParams, 'Sector', { SectorName: 'HDTV' }, 'SectorID');
      expect(newNewID.type).to.equal('existing');
    })
  });
  describe('gets a list of claims for a given patent selected', function () {
    it('retrieves a map of patents matching a certain number pattern', async function () {
      patentMap = await getPatents(connectParams, '414')
      expect(patentMap.get(5109414)).to.equal(141);
    })
    it('retrieves a claim dropdown given a valid patent ID', async function () {
      const claimMap = await getClaims(connectParams, patentMap.get(5109414));
      expect(claimMap.get(1)).to.equal(830);
    })
    it.skip('retrieves a claim when it isn\'t in the database', async function () {
    })
  })
  describe('Select Claim Term', function () {
    let termID, constructID;
    // when user selects a claim terms
    it('creates a new term if it doesn\'t already exist', async function () {
      termID = await addMarkman(connectParams, 'term', { term: 'zz_test' })
      expect(termID.TermID).to.exist();
    });
    it('creates a new construction and links it', async function () {
      constructID = await addMarkman(connectParams, 'construction', { construction: 'a test construction' });
      await addMarkman(connectParams, 'link', { constructID: constructID.ConstructID, termID: termID.TermID, claimID: 830 })
      expect(constructID).to.exist();
    });
    // enable 'update' button
    it('enables the `UPDATE` button when valid selections are made');
    it('disables the `UPDATE` button if a selections is changed to an invalid selection');
  });
  describe.skip('Select Update', function () {
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
  describe.skip('Close Window', function () {
    // when user selects 'close window'
    it('warns if update is not applied');
    // confirm if update not applied
    it('smoothly closes connections and processes without memory leaks');
    // close window
  });
});



