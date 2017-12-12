const fse = require('fs-extra');

function getDropBoxPath(callback) {
    fse.readJSON(`${process.env.LOCALAPPDATA}//Dropbox//info.json`, 'utf8', (err2, pathdata) => {
      if (err2) {
        console.log(dialog.showErrorBox('Dropbox Error', `Error getting Dropbox path: ${err2}`));
        return callback(err2);
      }
      // first, get the path to the local Dropbox folder and change the \ to /
      return callback(null, `${pathdata.business.path}/`);
    });
  }

  module.exports = {
      getDropBoxPath
  }