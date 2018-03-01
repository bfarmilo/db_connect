'use strict';

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var electron = require('electron');
var fse = require('fs-extra');
var spawn = require('child_process').spawn;
// local modules

var _require = require('./js/getDropBoxPath'),
    getDropBoxPath = _require.getDropBoxPath;

var _require2 = require('./js/app_DBconnect'),
    queryDatabase = _require2.queryDatabase;

var _require3 = require('./js/connectDocker'),
    connectDocker = _require3.connectDocker;

var _require4 = require('./js/getFullText'),
    getFullText = _require4.getFullText;

var _require5 = require('./jsx/app_sqlParse'),
    parseQuery = _require5.parseQuery,
    parseOrder = _require5.parseOrder,
    parseOutput = _require5.parseOutput;

var _require6 = require('./jsx/getPatents.js'),
    downloadPatents = _require6.downloadPatents;
// configuration


var changeLog = require('./changeLog.json');

var _require7 = require('./js/app_config.json'),
    patentDB = _require7.patentDB;
// developer


var _require8 = require('electron-devtools-installer'),
    installExtension = _require8.default,
    REACT_DEVELOPER_TOOLS = _require8.REACT_DEVELOPER_TOOLS;
// other constants


var app = electron.app,
    BrowserWindow = electron.BrowserWindow,
    shell = electron.shell,
    ipcMain = electron.ipcMain,
    dialog = electron.dialog;

var win = void 0;
var markmanwin = void 0;
var detailWindow = null;
var connectParams = void 0;
var dropboxPath = ''; // keeps the path to the local dropbox
var uriMode = process.env.USEDB === 'NextIdea'; // flag that indicates if claim HTML is uri-encoded or not
var totalCount = 0;

var ROWS_TO_RETURN = 200;

connectDocker(patentDB.connection).then(function (params) {
  connectParams = params;
  console.log('new connection parameters set: %j', connectParams);
}).catch(function (err) {
  return console.error(err);
});

// This method will be called when Electron has finished

/** openPDF will try to open a pdf file using the shell
 * 
 * @param {String} fullPath
 * @returns {void}
 */
var openPDF = function openPDF(fullPath) {
  console.log('trying shell: ' + dropboxPath + fullPath);
  shell.openItem(dropboxPath + fullPath);
};

/** createWindow launches the main window
 *  @returns {void}
 */
var createWindow = function createWindow() {
  // get the file paths
  getDropBoxPath(function (err, dropbox) {
    if (err) {
      console.error(err);
    } else {
      dropboxPath = dropbox;
    }
  });
  // Create the browser window.
  win = new BrowserWindow({
    width: 1440,
    height: 800
  });
  // and load the index.html of the app.
  win.loadURL('file://' + __dirname + '/claimtable.html');
  // Open the DevTools.
  installExtension(REACT_DEVELOPER_TOOLS).then(function (name) {
    console.log('Added Extension:  ' + name);
    win.webContents.openDevTools();
  }).catch(function (err) {
    console.error('An error occurred: ', err);
  });
  win.on('resize', function () {
    console.log('window size changed, sending new size');
    win.webContents.send('resize', { width: win.getSize()[0], height: win.getSize()[1] });
  });
  // Emitted when the window is closed.
  win.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    if (detailWindow) detailWindow.close();
    if (markmanwin) markmanwin.close();
    win = null;
  });
};

var getPatentWindow = void 0;
/** getNewPatent sets up the patent retrieval window
 * @param {number} patentNumber
 * @param {string} PMCRef
 * @param {string} outputPath
 * @param {boolean} uriMode
 * @returns {Object} ready for insertion into the DB
 */
var getNewPatent = function getNewPatent(patentNumber, PMCRef, outputPath, uriMode) {

  var activeWin = getPatentWindow.get(patentNumber);
  /** @private parseScript parses JS code into a string
   * @returns {string}
   */
  var parseScript = function parseScript() {
    return '\n    require(\'electron\').ipcRenderer.send(\'result_ready\', {\n      PatentPath: document.querySelector(\'.knowledge-card-action-bar a\').href,\n      Number: document.querySelector(\'.applist .approw .appno b\').innerHTML,\n      Title: document.querySelector(\'#title\').innerHTML,\n      downloadLink: document.querySelector(\'a.style-scope.patent-result\').href,\n      PatentUri: document.querySelector(\'.knowledge-card h2\').innerHTML,\n      Claims: Array.from(document.querySelector(\'#claims #text .claims\').children).map(claim => ({localName: claim.localName, outerHTML:claim.outerHTML, innerText:claim.innerText, className:claim.className}))\n    });\n    ';
  };

  activeWin.loadURL('https://patents.google.com/patent/US' + patentNumber + '/en');
  activeWin.on('closed', function () {
    getPatentWindow.delete(patentNumber);
  });
  activeWin.on('ready-to-show', function () {
    activeWin.webContents.openDevTools();
    console.log('window ready, executing in-page JS');
    //getPatentWindow.show();
    activeWin.webContents.executeJavaScript(parseScript(), false);
  });

  // content event listeners
  return new Promise(function (resolve) {
    ipcMain.once('result_ready', function (e, result) {
      console.log('received result event');
      activeWin.close();
      // Number: formatted as USAABBBCC, reformat to AA/BBB,CCC
      // PatentUri: formatted as USXYYYZZZBB, reformat to US.XYYYZZZ.BB
      // Title: trim whitespace
      // Claims: condition claims to exclude JSON-ineligible characters 
      // IndependentClaims: select all claims then count all top-level divs where class !== claim-dependent 
      return resolve((0, _extends3.default)({}, result, {
        Number: result.Number.replace(/US(\d{2})(\d{3})(\d{3})/, '$1/$2,$3'),
        PatentUri: result.PatentUri.replace(/(US)(\d{7})(\w+)/, '$1.$2.$3'),
        Title: result.Title.trim().split('\n')[0],
        Claims: result.Claims.filter(function (y) {
          return y.localName !== 'claim-statement';
        }).map(function (x) {
          return {
            ClaimNumber: parseInt(x.innerText.match(/(\d+)\./)[1], 10),
            ClaimHTML: uriMode ? encodeURIComponent(x.outerHTML.trim()).replace(/\'/g, '%27') : x.outerHTML,
            IsMethodClaim: x.innerText.includes('method'),
            IsDocumented: false,
            IsIndependentClaim: !x.className.includes('claim-dependent'),
            PatentID: 0
          };
        }),
        IndependentClaimsCount: result.Claims.filter(function (y) {
          return y.localName !== 'claim-statement' && !y.className.includes('claim-dependent');
        }).length,
        ClaimsCount: result.Claims.length,
        PatentNumber: patentNumber,
        PMCRef: PMCRef,
        IsInIPR: false,
        TechnologySpaceID: 1,
        TechnologySubSpaceID: 1,
        CoreSubjectMatterID: 1,
        PatentPath: outputPath + 'US' + patentNumber + '.pdf'
      }));
    });
  });
};

/** getAllPatents retrieves data and creates an array of results
 * @param {Object<number>} patentList an array of patents to retrieve, in XXXXXXX form
 * @param {String} patentRef the PMC Reference to associate with each patent TODO NEEDS WORK
 * @param {String} basePath the path from the dropbox to the folder where the full PDF's of the patent are stored
 * @returns {Array{Object}} an array of objects ready for sending to TODO downloads, disk, insert or update.
 */
var getAllPatents = function getAllPatents(patentList, patentRef, basePath) {
  getPatentWindow = new Map(patentList.map(function (patent) {
    return [patent, new BrowserWindow({ show: false })];
  }));
  return Promise.all([].concat((0, _toConsumableArray3.default)(getPatentWindow.keys())).map(function (patentNumber) {
    return getNewPatent(patentNumber, patentRef, basePath, uriMode);
  }));
};

// Electron listeners
// initialization and is ready to create browser windows.
app.on('ready', createWindow);
// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

//Listener for getting a patent
ipcMain.on('get_new_patents', function (event, patentList) {
  console.log('downloading data for patents', patentList);
  // coerce patentList into an array if it isn't already
  getAllPatents([].concat(patentList), 'NEW', '\\Bills Swap\\').then(function (result) {
    return console.log(JSON.stringify(result, null, 1));
  }).catch(function (error) {
    return console.error(error);
  });
});

//Listener for launching patent details
ipcMain.on('view_patentdetail', function (event, patentNumber) {

  /** private function that sends new data to the patent detail window
   * @param {Array<records>} newData - the JSON formatted data from the DB
   * @returns {void}
   */
  var updateRenderWindow = function updateRenderWindow(newData) {
    console.log('sending state for patent', newData.PMCRef);
    detailWindow.webContents.send('state', newData);
    detailWindow.show();
  };

  /** private function that queries the DB then hits the USPTO if empty
   * @returns {void}
   */
  var getPatentHtml = function getPatentHtml() {
    console.log('got call for patent detail view with patent number', patentNumber);
    queryDatabase(connectParams, 'p_PATENT', 'WHERE PatentNumber=@0', [patentNumber], ' FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER', function (err, data) {
      if (err) {
        console.error(err);
      } else {
        // if the query returns PatentHtml, serve it up,
        // otherwise, go fetch it, serve it up, and meanwhile update the DB with it !
        // data returns the row in multiple columns of an array (if large)
        var state = JSON.parse(data.reduce(function (accum, item) {
          return accum.concat(item);
        }, ''));
        if (!state.PatentHtml) {
          console.log('no PatentHtml found, querying USPTO for patent Full Text');
          getFullText(patentNumber).then(function (PatentHtml) {
            state.PatentHtml = JSON.stringify(PatentHtml);
            // now store the new data in the DB for future reference
            queryDatabase(connectParams, 'u_FULLTEXT', '', [state.PatentHtml, state.PatentID], '', function (err2, status) {
              if (err2) {
                console.error(err2);
              } else {
                console.log('record updated with new fullText');
                updateRenderWindow(state);
              }
            });
            return;
          }).catch(function (err3) {
            return console.error(err3);
          });
        } else {
          updateRenderWindow(state);
        }
      }
    });
  };

  if (detailWindow === null) {
    detailWindow = new BrowserWindow({
      width: 800,
      height: 1000,
      show: false
      //autoHideMenuBar: true
    });
    detailWindow.loadURL('file://' + __dirname + '/patentdetail.html');
    detailWindow.on('closed', function () {
      detailWindow = null;
    });
    detailWindow.on('ready-to-show', function () {
      console.log('window ready, calling getPatentHtml');
      getPatentHtml();
    });
  } else {
    getPatentHtml();
  }
});

// listener to handle when a user clicks on a patent link
ipcMain.on('open_patent', function (opEvent, linkVal) {
  console.log('received link click with path ' + linkVal);
  openPDF(linkVal);
});

// Listener for manual closing of the patent window via X button
ipcMain.on('close_patent_window', function (event) {
  detailWindow.close();
});

// Listener for launching the Markman Linking applications
ipcMain.on('add_claimconstructions', function () {
  // open new window for applications
  markmanwin = new BrowserWindow({
    width: 1440,
    height: 800
  });
  // and load the index.html of the app.
  markmanwin.loadURL('file://' + __dirname + '/markman.html');
  // Emitted when the window is closed.
  markmanwin.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    markmanwin = null;
  });
  // when the user enters a potential application
  // Load a list of patents, claims, claimID into patentsArray
  // Load list of claim terms & TermID into termsArray
  // Load list of constructions and ConstructID into constructArray
  // when user selects a claim terms
  // load past constructions & Patents, Claims and display on screen
  // ... user selects a patent / claim
  // ... user selects a constructions
  // enable 'update' button
  // when user selects 'update'
  // check to see if patent/claim is selected and construction is connected
  // update mtc table with TermID, ClaimID, ConstructID
  // clear values
  // disable 'update' button
  // when user selects 'close window'
  // confirm if update not applied
  // close window
});

// Listener for changing to the other Database
ipcMain.on('change_db', function (event) {
  var databases = {
    PMCDB: { uriMode: false, next: "NextIdea" },
    NextIdea: { uriMode: true, next: "GeneralResearch" },
    GeneralResearch: { uriMode: true, next: "PMCDB" }
  };
  var newDB = databases(connectParams.options.database).next;
  console.log('changing database to', newDB);
  connectParams.options.database = newDB;
  uriMode = databases(newDB).uriMode;
});

// Listener for a call to update PotentialApplication or WatchItems
ipcMain.on('json_update', function (event, oldItem, newItem) {
  // items have structure patentNumber, index, claimID, field, value
  changeLog.changes.push({ datetime: Date.now(), from: oldItem.value, to: newItem.value });
  fse.writeJSON('./changeLog.json', changeLog, 'utf8').then(function () {
    return queryDatabase(connectParams, 'u_UPDATE', ' ' + newItem.field + '=@0 WHERE ClaimID=@1', [newItem.value, parseInt(newItem.claimID, 10)], '', function (err2, result) {
      if (err2) {
        console.error(dialog.showErrorBox('Query Error', 'Error with update query ' + err2));
      } else {
        console.log('%s %s', newItem.field, result);
      }
    });
  }).catch(function (err) {
    return console.error(err);
  });
});

// Listener for a call to update the main window
ipcMain.on('json_query', function (event, query, orderBy, offset, appendMode) {

  var runQuery = function runQuery(newOffset) {
    queryDatabase(connectParams, 'p_SELECTJSON', 'WHERE ' + parsedQuery.where, parsedQuery.param, parseOrder(orderBy, offset, ROWS_TO_RETURN) + ' FOR JSON AUTO', function (err, result) {
      if (err) {
        console.error(err);
      } else {
        // send the result after parsing properly 
        win.webContents.send('json_result', parseOutput(result, uriMode), totalCount, newOffset, appendMode);
      }
    });
  };

  //remove duplicates and create an array of ({field, value}) objects
  var fieldList = Object.keys(query).filter(function (item) {
    return query[item] !== '';
  }).map(function (item) {
    return { field: item, value: query[item] };
  });
  console.log('reduced query to %s', JSON.stringify(fieldList));
  //make sure to URI-encode ClaimHtml if appropriate
  if (uriMode && fieldList.ClaimHtml) {
    fieldList.ClaimHtml = encodeURIComponent(fieldList.ClaimHtml).replace(/\'/g, '%27').replace('%', '[%]');
  }
  //in the case where a blank query is passed, default query is only show claim 1
  var parsedQuery = fieldList.length > 0 ? parseQuery(fieldList) : { where: 'claims.ClaimNumber LIKE @0', param: ['%'] };
  if (!appendMode) {
    queryDatabase(connectParams, 'p_COUNT', 'WHERE ' + parsedQuery.where, parsedQuery.param, '', function (err, count) {
      if (err) {
        console.error(err);
      } else {
        totalCount = count[0][0];
        console.log(totalCount);
        runQuery(ROWS_TO_RETURN);
      }
    });
  } else {
    // append mode, figure out the next offset
    runQuery(offset + ROWS_TO_RETURN <= totalCount ? offset + ROWS_TO_RETURN : offset);
  }
});
