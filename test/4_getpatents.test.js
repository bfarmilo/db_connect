'use strict';

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fse = require('fs-extra');

var _require = require('../jsx/getPatents'),
    getPatentData = _require.getPatentData,
    getClaimData = _require.getClaimData,
    downloadPatents = _require.downloadPatents;

var outputFile = './test/patentRecord.json';

var _require2 = require('../js/getDropBoxPath'),
    getDropBoxPath = _require2.getDropBoxPath;

var electron = require('electron');
// other constants
var app = electron.app,
    BrowserWindow = electron.BrowserWindow,
    ipcMain = electron.ipcMain;

// USAGE set USEDB=NextIdea & node ./test/4_getpatents.test.js [path_to_pdf] [PMC Ref]

var basePath = process.argv[2] || '\\Bills Swap\\'; //'PMC Public\\PMC GENERAL\\Opportunities\\Single touch\\' || 'PMC Public\\Licensing\\PMC Patents OCR\\';
var patentRef = process.argv[3] || 'SINGLE' || 'NAVI 81B';
var useIdx = process.env.USEDB === 'NextIdea';
var uriMode = useIdx;
var dropboxPath = void 0;

var patentList = [5164831, 8773401];

/* patentList.sort();

getDropBoxPath((err, dropBox) => {
    if (err) {
        console.error(err)
    } else {
        console.log('got dropbox path %s', dropBox);
        Promise.all(patentList.map((pat, idx) => getPatentData(pat, `${patentRef}${useIdx ?` ${idx+1}` : ''}`, dropBox, basePath, uriMode)))
            .then(result => {
                fse.writeJSON(outputFile, { Patents: result });
                return downloadPatents(result, dropBox);
            })
            .then(() => console.log('file successfully written'))
            .catch(err => console.error(err));
    }
}) */

var getNewPatent = function getNewPatent(patentNumber, PMCRef, outputPath, uriMode) {
  var testMode = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;


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

var getAllPatents = function getAllPatents() {
  getPatentWindow = new Map(patentList.map(function (patent) {
    return [patent, new BrowserWindow({ show: false })];
  }));
  Promise.all([].concat((0, _toConsumableArray3.default)(getPatentWindow.keys())).map(function (patentNumber) {
    return getNewPatent(patentNumber, patentRef, basePath, uriMode, true);
  })).then(function (results) {
    return console.log(results);
  });
};

var getPatentWindow = void 0;
var resultMap = new Map();

app.on('ready', getAllPatents);
// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
