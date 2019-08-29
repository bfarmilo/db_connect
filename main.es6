const electron = require('electron');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;
// local modules
const { getDropBoxPath } = require('./jsx/getDropBoxPath');
const { queryDatabase } = require('./jsx/app_DBconnect');
const { connectDocker, closeDocker } = require('./jsx/connectDocker');
const { getFullText } = require('./jsx/getFullText');
const { parseQuery, parseOrder, parseOutput } = require('./jsx/app_sqlParse');
const { createPatentQuery, downloadPatents } = require('./jsx/getPatents.js');
const { insertAndGetID, getTermConstructions, getConstructions } = require('./jsx/app_bulkUpload');
const { getAllImages } = require('./jsx/getImages');
const { initializeMarkman, getClaims, linkDocument, addMarkman, modifyMarkman } = require('./jsx/app_markmanInterface');
const { formatClaim } = require('./jsx/formatClaim');
// configuration
const { patentDB, patentParser } = require('./app_config.json');
// developer
// const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
// other constants
const { app, BrowserWindow, shell, ipcMain, dialog } = electron;

// windows we may decide to open
let win;
let markmanwin;
let detailWindow = null;
let imageWindow = null;
let newPatentWindow;
let timer;
let manualResize = true;

// globals
let totalCount = 0;
let dropboxPath = ''; // keeps the path to the local dropbox

// global constants
const ROWS_TO_RETURN = 200;
const SLICE_SIZE = 3;
const databases = {
  PMCDB: { uriMode: false, next: "NextIdea" },
  NextIdea: { uriMode: true, next: "GeneralResearch" },
  GeneralResearch: { uriMode: true, next: "PMCDB" }
};

// database parameters
let connectParams;
let uriMode; // flag that indicates if claim HTML is uri-encoded or not, default to false

// master error handler
process.on('uncaughtException', e => {
  console.error(e);
  console.error('fatal error, exiting app');
  if (win) win.close();
  if (app) app.quit();
});

// connect to the sql server
const connectToDB = async () => {
  try {
    connectParams = await connectDocker(patentDB.connection);
    uriMode = databases[connectParams.options.database].uriMode;
    console.log(`new connection parameters set: ${JSON.stringify(connectParams)}`);
    return connectParams.server;
  } catch (err) {
    return err;
  }
};

// close sql server connection
const closeDB = () => {
  return closeDocker(connectParams);
}

/** openPDF will try to open a pdf file using the shell
 * 
 * @param {String} fullPath
 * @returns {void}
 */
const openPDF = (fullPath, pageNo) => {
  console.log(`trying shell: ${dropboxPath}${fullPath}`);
  //TODO: replace with custom viewer, enable implementing page jumps
  shell.openItem(`${dropboxPath}${fullPath}`);
}

/** createWindow launches the main window
 *  @returns {void}
 */
const createWindow = () => {
  // get the file paths
  getDropBoxPath((err, dropbox) => {
    if (err) {
      console.error(err);
    } else {
      dropboxPath = dropbox;
    }
  });
  // Create the browser window.
  win = new BrowserWindow({
    width: 1440,
    height: 800,
  });
  // and load the index.html of the app.
  win.loadURL(`file://${__dirname}/claimtable.html`);
  // Open the DevTools.
  if (process.env.DEVTOOLS === 'show') win.webContents.openDevTools();
  /*   installExtension(REACT_DEVELOPER_TOOLS).then(name => {
      console.log(`Added Extension:  ${name}`);
      win.webContents.openDevTools();
    })
      .catch(err => {
        console.error('An error occurred: ', err);
      }); */
  win.on('resize', () => {
    console.log('window size changed, sending new size');
    clearTimeout(timer);
    timer = setTimeout(() => win.webContents.send('resize', { width: win.getSize()[0], height: win.getSize()[1] }), 500);
  });
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    if (detailWindow) detailWindow.close();
    if (markmanwin) markmanwin.close();
    if (newPatentWindow) newPatentWindow.close();
    win = null;
  });
}

/** getAllPatents retrieves data using a BrowserWindow and creates an array of results
 * uses global uriMode
 * @param {Object<number>} patentList an array of patents to retrieve, in XXXXXXX form
 * @param {String} patentRef the PMC Reference to associate with each patent TODO NEEDS WORK
 * @param {String} basePath the path from the dropbox to the folder where the full PDF's of the patent are stored
 * @returns {Array{Object}} an array of objects ready for sending to TODO downloads, disk, insert or update.
 */
const getAllPatents = (patentList, patentRef, outputPath, startIdx, claimText, update) => {
  // create a map of hidden browser windows indexed by a patent number
  const getPatentWindow = new Map(patentList.map(patent => [patent, new BrowserWindow({ show: false })]));

  const scrapeCode = `
  const ipc = require('electron').ipcRenderer;
  window.onerror = function (error, url, line) {
    ipc.send('scraping_error', error);
  }
  ipc.send('result_ready', {
    ${['Number', 'Title', 'downloadLink', 'PatentUri', 'InventorLastName'].map(key => `${key}: document.querySelector("${patentParser[key].selector}").${patentParser[key].target},`).join('\n  ')}
    Claims: Array.from(document.querySelector("${patentParser.Claims.selector}").${patentParser.Claims.target}).map(claim => ({localName: claim.localName, outerHTML:claim.outerHTML, innerText:claim.innerText, className:claim.className}))
  });`;

  /** @private getNewPatent sets up the (hidden) patent retrieval window
   * pushes in Javascript, and returns a patent Record
   * @param {number} patentNumber
   * @param {webContents} activeWin
   * @param {string} PMCRef
   * @param {boolean} uriMode
   * @param {Array<string>} claimText -> Should be an array of plain strings
   * @returns {Object} ready for insertion into the DB
   */
  const getNewPatent = (patentNumber, activeWin, PMCRef, uriMode, claimText = []) => {

    activeWin.loadURL(`https://patents.google.com/patent/US${patentNumber}/en`);
    activeWin.on('closed', () => {
      getPatentWindow.delete(patentNumber);
    });
    activeWin.on('ready-to-show', () => {
      if (process.env.DEVTOOLS === 'show') {
        activeWin.show();
        activeWin.webContents.openDevTools();
      }
      console.log('window ready, executing in-page JS for patent', patentNumber);
      activeWin.webContents.executeJavaScript(scrapeCode, false)
    })
    activeWin.on('did-fail-load', (...args) => {
      activeWin.send('page_load_error', { ...args });
    })

    // content event listeners
    return new Promise((resolve, reject) => {
      ipcMain.on('scraping_error', (e, error) => {
        return reject(error);
      })
      ipcMain.once('result_ready', async (e, result) => {
        console.log('received result event')
        activeWin.close();
        // Number: formatted as US:AABBBCC, reformat to AA/BBB,CCC
        // PatentUri: formatted as USXYYYZZZBB, reformat to US.XYYYZZZ.BB
        // Title: trim whitespace
        // Claims: condition claims to exclude JSON-ineligible characters
        const Claims = claimText && claimText.length ? 
          claimText.map(claim => formatClaim(claim.text, claim.status)) :
          result.Claims.filter(y => y.localName !== 'claim-statement')
          .map(x => ({
            ClaimNumber: parseInt(x.innerText.match(/(\d+)\./)[1], 10),
            ClaimHTML: uriMode ? encodeURIComponent(x.outerHTML.trim()).replace(/\'/g, '%27') : x.outerHTML,
            IsMethodClaim: x.innerText.includes('method'),
            IsDocumented: false,
            IsIndependentClaim: !x.className.includes('claim-dependent'),
            PatentID: 0
          }))
        // IndependentClaims: select all claims then count all top-level divs where class !== claim-dependent
        // InventorLastName: split name on ' ' and take the last element of the array
        return resolve(
          {
            ...result,
            Number: result.Number.replace(/US:(\d{2})(\d{3})(\d{3})/, '$1/$2,$3'),
            PatentUri: result.PatentUri.replace(/(US)(\d{7})(\w+)/, '$1.$2.$3'),
            Title: result.Title.trim().split('\n')[0],
            InventorLastName: result.InventorLastName.split(' ')[result.InventorLastName.split(' ').length - 1],
            Claims,
            IndependentClaimsCount: result.Claims.filter(y => y.localName !== 'claim-statement' && !y.className.includes('claim-dependent')).length,
            ClaimsCount: result.Claims.length,
            PatentNumber: patentNumber,
            PMCRef,
            IsInIPR: false,
            TechnologySpaceID: 1,
            TechnologySubSpaceID: 1,
            CoreSubjectMatterID: 1,
            PatentPath: `${outputPath}\\US${patentNumber}.pdf`,
          }
        );
      });
    });
  }

  /** @private stepThroughPatents old-school sequential screen scraping
   * @returns {Array<patentRecord>}
   */
  const stepThroughPatents = async () => {
    let patentRecords = [];
    let index = 0;
    //TODO: Option to use inventor last name instead of patentRef
    for (let [patentNumber, browserWin] of getPatentWindow.entries()) {
      try {
        patentRecords.push(await getNewPatent(patentNumber, browserWin, `${patentRef} ${startIdx + index}`, uriMode, claimText));
        index++;
        update(patentNumber, 'scraped');
      } catch (err) {
        index++;
        console.error(err);
        update(patentNumber, 'error')
      }
    };
    return patentRecords;
  }

  return Promise.resolve(stepThroughPatents());
}

/** Calls functions to write patent record to the DB and [optionally] download PDF's to the Dropbox
 * Uses globals dropBoxPath and connectParams
 * 
 * @param {Array<PatentRecords>} patentList -> a list of patent records returned from the internet
 * @param {String} reference -> PMCRef to apply to the new collection
 * @param {String} storagePath -> Mount point on the dropbox to store PDF's
 * @param {boolean} downloadPats [opt] -> True if patents need to be downloaded
 */
const writeNewPatents = async (patentList, reference, storagePath, downloadPats, filterClaims, startCount, claimText) => {
  let addedList = [];
  const filterOptions = new Map([
    ['independent', { field: 'IsIndependentClaim', value: /true/g }],
    ['dependent', { field: 'IsIndependentClaim', value: /false/g }],
    ['claim1', { field: 'ClaimNumber', value: /^1$/g }],
    ['allbut1', { field: 'ClaimNumber', value: /(^[1].+|^[^1]$)/g }],
    ['all', false]
  ]);
  const claimFilter = filterOptions.get(filterClaims);

  const sendUpdate = (patentNumber, status) => {
    // send to the window to update status
    newPatentWindow.webContents.send('new_patents_ready', [patentNumber, status]);
  };

  const getNextSlice = async newStart => {
    if (newStart > patentList.length) {
      return;
    }
    try {
      const currentSlice = patentList.slice(newStart, newStart + SLICE_SIZE);
      const result = await getAllPatents(currentSlice, reference, storagePath, startCount + newStart, claimText, sendUpdate);
      console.log(result.map(patent => `${patent.PatentNumber} (${patent.PMCRef})`));
      if (downloadPats) downloadPatents(result, dropboxPath, sendUpdate);
      addedList.push(await createPatentQuery(connectParams, result, sendUpdate, claimFilter));
      return getNextSlice(newStart + SLICE_SIZE);
    } catch (err) {
      return Promise.reject(err)
    }
  }

  try {
    console.log('downloading data for patents', patentList);
    await getNextSlice(0);
    win.webContents.send('new_patents_ready', addedList);
  } catch (err) {
    // send error to getPatent window
    console.error(err);
  }
};


/** getNewPatentUI sets up the interface to accept new patents */
const getNewPatentUI = () => {
  if (!newPatentWindow) {
    newPatentWindow = new BrowserWindow();
    newPatentWindow.loadURL(`file://${__dirname}/getNewPatentUI.html`);
    if (process.env.DEVTOOLS === 'show') newPatentWindow.webContents.openDevTools();
    newPatentWindow.on('closed', () => {
      newPatentWindow = null;
    });
  } else {
    newPatentWindow.webContents.focus();
  }
}

// Electron listeners
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  try {
    await connectToDB();
    createWindow();
  } catch (err) {
    console.error(err)
  }
});
// Quit when all windows are closed.
app.on('window-all-closed', async () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    await closeDB();
    app.quit();
  }
});
app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

/** EVENT LISTENERS */

//Listener for getting a patent and loading the DB, optionally downloading it
ipcMain.on('get_new_patents', (event, ...args) => writeNewPatents(...args));

// Listener for selecting a new browse point for saving new patents
ipcMain.on('browse', (e, startFolder) => {
  console.log(`${dropboxPath}${startFolder}`);
  dialog.showOpenDialog(newPatentWindow,
    {
      defaultPath: `${dropboxPath}${startFolder}`,
      properties: ['openDirectory']
    }, folder => {
      newPatentWindow.webContents.send('new_folder', folder[0].split(dropboxPath)[1]);
    })
})

// Listener for launching new Patent retrieval UI
ipcMain.on('new_patent_retrieval', (e) => getNewPatentUI());

/** private function that sends new data to the patent detail window
 * @param {Array<records>} newData - the JSON formatted data from the DB
 * @returns {void}
 */
const updateRenderWindow = (newData, targetWindow) => {
  console.log(newData.hasOwnProperty('working') ? `sending data to window ${targetWindow.id}` : `sending message ${newData.working} to ${targetWindow.id}`);
  // ? 'sending working message to detail window' : 'sending state for patent', newData.PMCRef || newData[0].PatentID);
  targetWindow.webContents.send('state', newData);
  targetWindow.show();
  return targetWindow;
}

//Listener for launching patent details
ipcMain.on('view_patentdetail', (event, patentNumber) => {
  /** private function that queries the DB then hits the USPTO if empty
   * @returns {void}
   */
  const getPatentHtml = () => {
    updateRenderWindow({ working: true }, detailWindow);
    console.log('got call for patent detail view with patent number', patentNumber);
    queryDatabase(connectParams, 'p_PATENT', `WHERE PatentNumber=@0`, [patentNumber], ' FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER', async (err, data) => {
      if (err) {
        console.error(err)
      } else {
        // if the query returns PatentHtml, serve it up,
        // otherwise, go fetch it, serve it up, and meanwhile update the DB with it !
        // data returns the row in multiple columns of an array (if large)
        const state = JSON.parse(data.reduce((accum, item) => accum.concat(item), ''));
        if (!state.PatentHtml) {
          console.log('no PatentHtml found, querying USPTO for patent Full Text');
          detailWindow.webContents.send('available_offline', false);
          getFullText(patentNumber)
            .then(PatentHtml => {
              state.PatentHtml = JSON.stringify(PatentHtml);
              return updateRenderWindow(state, detailWindow);
            })
            .catch(err3 => console.error(err3))
        } else {
          // we found it, so it is already available offline
          detailWindow.webContents.send('available_offline', true);
          return updateRenderWindow(state, detailWindow);
        }
      }
    })
  }


  if (detailWindow === null) {
    const [x, y] = win.getPosition();
    detailWindow = new BrowserWindow({
      width: 800,
      height: 1000,
      x: x + 20,
      y,
      show: false
    });
    detailWindow.loadURL(`file://${__dirname}/patentdetail.html`);
    detailWindow.on('closed', () => {
      detailWindow = null;
      if (imageWindow) imageWindow.close();
    });
    detailWindow.on('ready-to-show', () => {
      console.log('window ready, calling getPatentHtml');
      detailWindow.webContents.send('resize', { width: 800, height: 1000 });
      getPatentHtml();
    })
    detailWindow.on('resize', () => {
      console.log('detailWindow size changed, sending new size');
      clearTimeout(timer);
      timer = setTimeout(() => detailWindow.webContents.send('resize', { width: detailWindow.getSize()[0], height: detailWindow.getSize()[1] }), 500);
    });
  } else {
    console.log('window already visible, calling getPatentHtml');
    getPatentHtml();
  }
})

ipcMain.on('store_images', (event, imageMap) => {
  // uses connectParams, imageWindow
  // imports insertAndGetID
  console.log('writing current image data to DB')
  // destructure the map and turn it into a simple array of ID's and pageData's
  const imageRecords = imageMap.map(([pg, record]) => ({ ImageID: record.imageID, PageData: record.pageData }));
  return Promise.all(imageRecords.map(imageRecord => insertAndGetID(connectParams, 'Images', imageRecord, 'ImageID', { skipCheck: ['PageData'], updateFields: ['PageData'] })))
    .then(status => {
      imageWindow.webContents.send('available_offline', true);
      console.log(status)
    })
    .catch(err => console.error(err))
})

ipcMain.on('store_fulltext', (event, PatentHtml, PatentID) => {
  // uses connectParams, detailWindow
  // imports queryDatabase
  console.log('writing fullText to DB');
  // now store the new data in the DB for future reference
  queryDatabase(connectParams, 'u_FULLTEXT', '', [PatentHtml, PatentID], '', (err, status) => {
    if (err) {
      console.error(err);
    } else {
      detailWindow.webContents.send('available_offline', true);
      console.log('record updated with new fullText');
    }
  })
})

ipcMain.on('show_images', (event, PatentID, patentNo) => {
  // uses connectParams, imageWindow
  // imports queryDatabase, updateRenderWindow, getAllImages, insertAndGetID

  const getPatentImages = () => {
    const DEFAULT_ROTATION = 90;
    console.log('got call for patent detail view with patent ID', PatentID);
    queryDatabase(connectParams, 'p_IMAGES', `WHERE PatentID=@0`, [PatentID], ' FOR JSON AUTO', (err, data) => {
      if (err) throw err;
      // if the query returns image data, serve it up,
      const resultList = data.length && JSON.parse(data.join(''));
      const hasPageData = resultList && resultList[0] && resultList[0].PageData;
      imageWindow.webContents.send('available_offline', hasPageData);
      if (resultList && hasPageData) return updateRenderWindow(resultList, imageWindow);
      // otherwise, go fetch it, serve it up !
      console.log('no image data found, querying USPTO for images');
      // get images from USPTO
      return getAllImages(patentNo)
        .then(result => {
          // first: if we have data but no pageData just append it and add
          if (resultList) return updateRenderWindow(result.map(image => {
            const currentRecord = resultList.filter(page => page.PageNumber === image.PageNumber)[0];
            return { ...currentRecord, PageData: image.PageData };
          }), imageWindow);
          // if we're here, we don't have any records, and hence no ImageID. Need to insert images into the DB
          return Promise.all(result.map(imageRecord => insertAndGetID(
            connectParams,
            'Images',
            { PatentID, Rotation: DEFAULT_ROTATION, ...imageRecord },
            'ImageID',
            {
              skipCheck: ['PageData', 'Rotation'],
              skipWrite: ['PageData']
            }
          )))
            .then(idList => {
              // now the records are there, minus any page data. re-query to get the ImageID's, append
              // PageData, and send it off to the renderer window
              queryDatabase(connectParams, 'p_IMAGES', `WHERE PatentID=@0`, [PatentID], ' FOR JSON AUTO', (err2, data2) => {
                if (err2) throw err2;
                return updateRenderWindow(result.map(image => {
                  const currentRecord = JSON.parse(data2.join('')).filter(page => page.PageNumber === image.PageNumber)[0];
                  return { ...currentRecord, PageData: image.PageData };
                }), imageWindow);
              })
            })
        })
        .catch(error => console.error(error))
    });
  }

  if (imageWindow === null) {
    const [x, y] = detailWindow.getPosition();
    const [xSize, ySize] = detailWindow.getSize();
    imageWindow = new BrowserWindow({
      width: 650,
      height: 425,
      y,
      x: x + xSize + 10,
      show: false
    });
    imageWindow.loadURL(`file://${__dirname}/patentfigures.html`);
    imageWindow.on('closed', () => {
      imageWindow = null;
    });
    imageWindow.on('ready-to-show', () => {
      console.log('window ready, calling getPatentHtml');
      imageWindow.webContents.send('resize', { width: 650, height: 425 });
      getPatentImages();
      imageWindow.show();
    })
    imageWindow.on('resize', () => {
      if (manualResize) {
        // only send update if manualResize = true
        clearTimeout(timer);
        timer = setTimeout(() => {
          console.log('imageWindow size changed, sending new size');
          const [width, height] = imageWindow.getContentSize();
          imageWindow.webContents.send('resize', { width, height })
        }, 500);
      } else {
        // reset to listen for mouse events
        manualResize = true;
      }

    });
  } else {
    getPatentImages();
  }
})

ipcMain.on('change_window_rotation', e => {
  // reset the window size to keep the image size constant
  const [height, width] = imageWindow.getContentSize();
  imageWindow.setContentSize(width, height);
  imageWindow.webContents.send('resize', { width, height });
})

ipcMain.on('request_resize', (e, width, height) => {
  manualResize = false;
  const newWidth = Math.round(width) + 1;
  const newHeight = Math.round(height) + 1;
  imageWindow.setContentSize(newWidth, newHeight);
})

ipcMain.on('rotate_image', (opEvent, newRot, imageID) => {
  console.log(`request to rotate imageID ${imageID} to ${newRot} degrees`);
  // write the new rotation data to the DB
  insertAndGetID(connectParams, 'Images', { Rotation: newRot, ImageID: imageID }, 'ImageID', { skipCheck: ['Rotation'], updateFields: ['Rotation'] })
    .then(status => console.log(status))
    .catch(err => console.error(err));
  // no need to re-query since the component updates its local copy also
})

// listener to handle when a user clicks on a patent link
ipcMain.on('open_patent', (opEvent, linkVal, pageNo = 1) => {
  console.log(`received link click with path ${linkVal}`);
  openPDF(linkVal, pageNo);
});

// Listener for manual closing of the patent window via X button
ipcMain.on('close_patent_window', event => {
  detailWindow.close();
})

// Listener for launching the Markman Linking applications
ipcMain.on('add_claimconstructions', async () => {
  // open new window for applications
  markmanwin = new BrowserWindow({
    width: 1440,
    height: 800,
    options: {
      visible: false
    }
  });
  // and load the index.html of the app.
  markmanwin.loadURL(`file://${__dirname}/markman.html`);
  // Open the DevTools.
  if (process.env.DEVTOOLS === 'show') markmanwin.webContents.openDevTools();
  // Emitted when the window is closed.
  markmanwin.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    markmanwin = null;
  });
});

ipcMain.on('markman_ready', async event => {
  const { claimTerms, clients, sectors, patents } = await initializeMarkman(connectParams);
  markmanwin.webContents.send('init_complete', [...claimTerms], [...clients], [...patents]);
  markmanwin.show();
})

ipcMain.on('get_claims', async (e, patentID) => {
  const claims = await getClaims(connectParams, patentID);
  markmanwin.webContents.send('got_claims', [...claims]);
})

ipcMain.on('get_file', async (e, client, ClientID) => {
  const { document, documentID } = await linkDocument(connectParams, dropboxPath, client, ClientID);
  markmanwin.webContents.send('got_file', document, documentID);
})

ipcMain.on('get_constructions', async (e, query) => {
  //query has the form {<ClientID>, <TermID>, <ClaimID>}
  //First get MarkmanTermConstruction matching any given ID coming in
  const mtcList = await getTermConstructions(connectParams, query);
  //send those off because we have them
  markmanwin.webContents.send('got_termconstructions', [...mtcList]);
  const constructionList = await getConstructions(connectParams, query);
  markmanwin.webContents.send('got_constructions', [...constructionList]);
});

ipcMain.on('markman_write', async (e, list, record) => {

  // map a term to a term table query
  const termRecord = { ClaimTerm: record.term }
  // if no TermID is sent, it is a new term. So write and store the termID
  const TermID = record.termID || await addMarkman(connectParams, 'term', termRecord);

  // map a construction to a construction table query
  const constructionRecord = {
    DocumentID: record.documentID,
    Construction: record.construction,
    MarkmanPage: record.page,
    Agreed: record.agreed,
    Court: record.court
  }
  // if no ConstructID is sent, it is a new construction, so write & store the constructID
  const ConstructID = record.constructID || await addMarkman(connectParams, 'construction', constructionRecord);

  // map the term, construction, and client to the claim
  const linkRecord = list.map(([key, value]) => {
    const returnRecord = {
      TermID,
      ConstructID,
      ClaimID: value.claimID,
      ClientID: value.clientID
    }
    // if it contains a termConstructID it is an existing link record, so add it
    if (Object.keys(value).includes('termConstructID')) {
      returnRecord.TermConstructID = value.termConstructID;
    }
    return returnRecord;
  })

  // now write the new links and collect the constructionID's for resending
  const TermConstructIDList = Promise.all(linkRecord.map(entry => {
    // if the record has a TermConstructID then just modify the record and return the TermConstructID
    if (entry.TermConstructID) {
      return modifyMarkman(connectParams, {
        ...entry,
        ...constructionRecord,
        ...termRecord
      })
    }
    // if not then add the record using 'link' mode
    return addMarkman(connectParams, 'link', { ...entry })
  }));

  // finally, send the new termConstructionIDs back to the renderer in place
  markmanwin.webContents.send('write_complete', TermConstructIDList.map((TermConstructID, index) => {
    list[index][1].TermConstructID = TermConstructID;
    return list[index];
  }))
})

// Listener for changing to the other Databases
ipcMain.on('change_db', event => {
  const newDB = databases[connectParams.options.database].next;
  console.log('changing database to', newDB);
  connectParams.options.database = newDB;
  uriMode = databases[newDB].uriMode;
})

// Listener for a call to update PotentialApplication or WatchItems
ipcMain.on('json_update', async (event, oldItem, newItem) => {
  // items have structure patentNumber, index, claimID, field, value
  let changeLog = { changes: [] };
  try {
    changeLog = await fse.readJSON('./changeLog.json');
  } catch (err) {
    console.error('changeLog not found, creating new file');
  }
  changeLog.changes.push({ datetime: Date.now(), from: oldItem.value, to: newItem.value });
  fse.writeJSON('./changeLog.json', changeLog, 'utf8')
    .then(() => queryDatabase(connectParams, 'u_UPDATE', ` ${newItem.field}=@0 WHERE ClaimID=@1`, [newItem.value, parseInt(newItem.claimID, 10)], '', (err2, result) => {
      if (err2) {
        console.error(dialog.showErrorBox('Query Error', `Error with update query ${err2}`));
      } else {
        console.log('%s %s', newItem.field, result);
      }
    }))
    .catch(err => console.error(err));
})

// Listener for a call to update the main window
ipcMain.on('json_query', (event, mode, query, orderBy, offset, appendMode) => {

  const runQuery = newOffset => {
    queryDatabase(connectParams, mode === 'claims' ? 'p_SELECTJSON' : 'm_MARKMANALL', `WHERE ${parsedQuery.where}`, parsedQuery.param, `${parseOrder(orderBy, offset, ROWS_TO_RETURN)} FOR JSON AUTO`, (err, result) => {
      if (err) {
        console.error(err);
      } else {
        // send the result after parsing properly 
        win.webContents.send('json_result', parseOutput(mode, result, uriMode), totalCount, newOffset, appendMode);
      }
    })

  }

  //remove duplicates and create an array of ({field, value}) objects
  const fieldList = Object.keys(query).filter(item => query[item] !== '').map(item => ({ field: item, value: query[item] }));
  console.log('reduced query to %s with mode %s', JSON.stringify(fieldList), mode);
  //make sure to URI-encode ClaimHtml if appropriate
  if (uriMode && fieldList.ClaimHtml) {
    fieldList.ClaimHtml = encodeURIComponent(fieldList.ClaimHtml).replace(/\'/g, '%27').replace('%', '[%]');
  }
  //in the case where a blank query is passed, default query is only show claim 1
  const parsedQuery = fieldList.length > 0 ? parseQuery(fieldList) : { where: 'claims.ClaimNumber LIKE @0', param: ['%'] };
  if (!appendMode) {
    queryDatabase(connectParams, mode === 'claims' ? 'p_COUNT' : 'm_COUNT', `WHERE ${parsedQuery.where}`, parsedQuery.param, '', (err, count) => {
      if (err) {
        console.error(err)
      } else {
        totalCount = count[0][0];
        console.log(totalCount);
        runQuery(ROWS_TO_RETURN);
      }
    })
  } else {
    // append mode, figure out the next offset
    runQuery(offset + ROWS_TO_RETURN <= totalCount ? offset + ROWS_TO_RETURN : offset);
  }
});