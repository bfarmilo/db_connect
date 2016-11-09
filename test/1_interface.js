const expect = require('chai').expect;
const jsdom = require('jsdom');
const electron = require('electron');
const { ipcRenderer, ipcMain } = electron;
// const $ = require('jquery');
const fs = require('fs');
// first load the DOM and enable scripts
const html = fs.readFileSync('./index.html', 'utf-8');
const re = /<script src="(.+)">/gim;
const matches = [];
let match = re.exec(html);
//
while (match !== null) {
  matches.push(match[1]);
  match = re.exec(html);
}
// scripts.splice(scripts.length - 1, 0, fs.readFileSync(`${__dirname}/mocks/map.js`));
const src = matches.map(scriptSrc => fs.readFileSync(`./${scriptSrc}`, 'utf8'));
// variables to store ipc data
let searchObj = {
  srch: '',
  srvl: '',
  doc: false,
  meth: false,
  save: false,
};

// main tests
describe('The UI responds to user input, can send and recieve data to the main process', () => {
  describe('The UI can produce basic searches', () => {
    it('responds to enter key to initiate search', (done) => {
      jsdom.env({
        ipcMain.on('new_query', (opEvent, queryJSON) => {
          // querystring comes back as {srch:'a%20OR%20b', srvl:} etc.
          const eventFired = opEvent;
          console.log(`captured event: ${eventFired}`);
          expect(opEvent).to.not.be.empty;
          searchObj = queryJSON;
          window.close();
          done();
        });
        html,
        src,
        done(err, window) {
          const $ = window.$;
          // set up event listeners

          const press = $.Event('keypress');
          // invoke an enter keypress with target = document
          press.ctrlKey = false;
          press.which = 13;
          $('document').trigger(press);
          $('#Update').click();
          // update button should fire, might have a timing issue here !

          setTimeout(() => {
            expect(searchObj.srch).to.be.empty;
            expect(searchObj.srvl).to.be.empty;
            // done();
          }, 1500);
        },
      });
    });
    it('parses an unselected search properly', (done) => {
      jsdom.env({
        html,
        src,
        done(err, window) {
          const $ = window.$;
          // enter test code here
          window.close();
          done();
        },
      });
    });
    it('parses a single patent number search properly');
    it('parses a AND-OR-NOT patent number search properly');
    it('parses a single PMC-Ref search properly');
    it('parses an AND-OR-NOT PMC-Ref search properly');
    it('parses a single Potential Application search properly');
    it('parses an AND-OR-NOT Potential Application search properly');
    it('parses a single Claim text search properly');
    it('parses an AND-OR-NOT Claim text search properly');
    it('parses a single Watch Items search properly');
    it('parses an AND-OR-NOT Watch Items search properly');
  });
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
});
