const Application = require('spectron').Application;
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const path = require('path');
const expect = chai.expect;
const appPath = path.resolve(__dirname, '../');
const electronPath = path.resolve(__dirname, '../node_modules/.bin/electron.cmd');

const app = new Application({
  path: electronPath,
  args: [appPath],
});

chai.use(chaiAsPromised);
// main tests
describe('The UI responds to user input, can send and recieve data to the main process', () => {
  describe('The UI can produce basic searches', function () {
    this.timeout(10000);
    before(function () {
      return app.start();
    });
    before(function () {
      chaiAsPromised.transferPromiseness = app.transferPromiseness;
      return app;
    });
    after(function () {
      if (app && app.isRunning()) {
        return app.stop();
      }
      return null;
    });
    it('opens a window', function () {
      expect(app.client.getWindowCount()).to.eventually.equal(1);
    });
    /*
    //TODO -- update these for new UI
    it('responds to enter key to initiate search', function () {
      const one = app.client.keys('Enter')
        .then(function (){
          return app.client.waitUntilTextExists('#Update', 'Working', 10000)
        })
        .then(function () {
          return app.client.waitUntilTextExists('#Update', 'Run', 10000)
        })
        .then(function () {
          return app.client.getMainProcessLogs(); //clear logs
        })
        .then(function (logs) {
          return app.client.getText('#Update');
        });
      return expect(one).to.eventually.match(/Run.+/);
    });
    it('parses a single patent number search properly', function () {
      testString = '649';
      testField = '#Pa';
      searchObj.srch = 'Pa';
      searchObj.srvl = '649';

      const two = app.client.pause(1000)
        .then(function () {
          return app.client.click('#SearchField')
        })
        .then(function () {
          return app.client.click(testField);
        })
        .then(function () {
          return app.client.setValue('#SearchValue', testString);
        })
        .then(function () {
          return app.client.click('#Update');
        })
        .then(function (){
          return app.client.waitUntilTextExists('#Update', 'Working', 10000)
        })
        .then(function () {
          return app.client.waitUntilTextExists('#Update', 'Run', 10000)
        })
        .then(function () {
          return app.client.getMainProcessLogs()
          .then(function (logs) {
            return JSON.parse(logs[1].slice(logs[1].search(/{/)));
          });
        });
      return expect(two).to.eventually.have.property('srvl');
    });
    it('parses a AND-OR-NOT patent number search properly', function () {
      testString = '649,650+!252';
      testField = '#Pa'
      searchObj.srch = 'Pa';
      searchObj.srvl = '649 OR 650 AND NOT 252';

      const two = app.client.pause(1000)
        .then(function () {
          return app.client.click('#SearchField')
        })
        .then(function () {
          return app.client.click(testField);
        })
        .then(function () {
          return app.client.setValue('#SearchValue', testString);
        })
        .then(function () {
          return app.client.click('#Update');
        })
        .then(function (){
          return app.client.waitUntilTextExists('#Update', 'Working', 10000)
        })
        .then(function () {
          return app.client.waitUntilTextExists('#Update', 'Run', 10000)
        })
        .then(function () {
          return app.client.getMainProcessLogs()
          .then(function (logs) {
            return JSON.parse(logs[1].slice(logs[1].search(/{/))).srvl;
          });
        });
        return expect(two).to.eventually.equal(searchObj.srvl);
    });
    it('parses a single PMC-Ref search properly', function () {
      testString = 'DEC';
      testField = '#PM'
      searchObj.srch = 'PM';
      searchObj.srvl = 'DEC';

      const two = app.client.pause(1000)
        .then(function () {
          return app.client.click('#SearchField')
        })
        .then(function () {
          return app.client.click(testField);
        })
        .then(function () {
          return app.client.setValue('#SearchValue', testString);
        })
        .then(function () {
          return app.client.click('#Update');
        })
        .then(function (){
          return app.client.waitUntilTextExists('#Update', 'Working', 10000)
        })
        .then(function () {
          return app.client.waitUntilTextExists('#Update', 'Run', 10000)
        })
        .then(function () {
          return app.client.getMainProcessLogs()
          .then(function (logs) {
            return JSON.parse(logs[1].slice(logs[1].search(/{/))).srvl;
          });
        });
      return expect(two).to.eventually.equal(searchObj.srvl);
    });
    it('parses an AND-OR-NOT PMC-Ref search properly');
    it('parses a single Potential Application search properly', function () {
      testString = 'appl';
      testField = '#Po'
      searchObj.srch = 'Po';
      searchObj.srvl = 'appl';

      const two = app.client.pause(1000)
        .then(function () {
          return app.client.click('#SearchField')
        })
        .then(function () {
          return app.client.click(testField);
        })
        .then(function () {
          return app.client.setValue('#SearchValue', testString);
        })
        .then(function () {
          return app.client.click('#Update');
        })
        .then(function (){
          return app.client.waitUntilTextExists('#Update', 'Working', 10000)
        })
        .then(function () {
          return app.client.waitUntilTextExists('#Update', 'Run', 10000)
        })
        .then(function () {
          return app.client.getMainProcessLogs()
          .then(function (logs) {
            return JSON.parse(logs[1].slice(logs[1].search(/{/))).srvl;
          });
        });
      return expect(two).to.eventually.equal(searchObj.srvl);
    });
    it('parses an AND-OR-NOT Potential Application search properly');
    it('parses a single Claim text search properly');
    it('parses an AND-OR-NOT Claim text search properly');
    it('parses a single Watch Items search properly');
    it('parses an AND-OR-NOT Watch Items search properly');
  });
  */
  describe('The UI can produce combo searches', () => {
    it('parses an patent number + Documented search properly');
    it('parses a Potential Application + Method search properly');
    it('parses a saved Search request properly');
  });
  describe('The UI updates the table based on data returned', () => {
    it('updates the table when data is returned');
    it('updates the table gracefully when no data is returned');
    it('shows a row count equal to the number of rows in the table');
  });
  describe('Patent Links in the table work', () => {
    it('creates a link in the patent number box');
    it('launches an external PDF viewer when patent link is clicked');
  });
  describe('The UI properly Hides/Shows claim details', () => {
    it('shows and hides claim text when the button is clicked');
  });
  describe('Allows Potential Application to be updated in the table', () => {
    it('enables editing in the Potential Application cell');
    it('detects if Enter is pressed in the cell');
    it('parses an update properly on Enter');
    it('detects if ESC is pressed in teh cell');
    it('escapes and restores the cell with no update on ESC');
  });
  describe('Enables the Markman UI', () => {
    it('switches to Markman view if Terms or Constructions selected');
    it('parses a single Terms search properly');
    it('parses an AND-OR-NOT Terms search properly');
    it('parses a single Construction search properly');
    it('parses an AND-OR-NOT Construction search properly');
  });
  describe('Displays Markman Data in the table', () => {
    it('updates the table when markman data is returned');
    it('updates the table gracefully when no data is returned');
    it('creates a link in the Ruling box');
    it('launches an external PDF viewer when ruling link is clicked');
  });
  describe('Shows a Patent Window', () => {
    
  })
})
