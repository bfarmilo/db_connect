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

// test bed
const DB = require('../app_config.json').patentDB;
const database = require('../jsx/app_dbInterface.js');


chai.use(chaiAsPromised);
// main tests
describe('The sqlite backend can perform basic connections', () => {
  describe('The sqlite database is created and simple getters return values', function () {
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
    it('connects to a db', function () {
      expect(database.connectToDB(DB, {testMode:true})).to.eventually.equal(0);
    });
    it('gets a master path in test mode', () => {
        expect(database.getMasterPath()).to.include('resources');
    });
    it('gets a local path in test mode', () => {
        expect(database.getLocalPath()).to.include('dbviewer');
    });
    it('closes a database gracefully', () => {
        expect(database.closeDB()).to.equal(0);
    })
  })
});


