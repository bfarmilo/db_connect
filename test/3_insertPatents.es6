const { createPatentQuery, downloadPatents } = require('../jsx/getPatents.js');
const { Patents } = require('./patentRecord.json');
const { connectDocker } = require('../js/connectDocker');

let uriMode = true;
let connectParams;

//mockup
const getAllPatents = async () => Promise.resolve(Patents);

/** needs globals uriMode, connectParams */
/*************************************************TEST ZONE */


/** Calls functions to write patent record to the DB and [optionally] download PDF's to the Dropbox
 * Uses globals dropBoxPath and connectParams
 * 
 * @param {Array<PatentRecords>} patentList -> a list of patent records returned from the internet
 * @param {String} reference -> PMCRef to apply to the new collection
 * @param {String} storagePath -> Mount point on the dropbox to store PDF's
 * @param {boolean} downloadPats [opt] -> True if patents need to be downloaded
 */
const writeNewPatents = (patentList, reference, storagePath, downloadPats, startCount) => new Promise(async (resolve, reject) => {
    try {
        console.log('downloading data for patents', patentList);
        // coerce patentList into an array if it isn't already
        //TODO: Assign references more smartly
        const result = await getAllPatents(patentList, reference, storagePath, startCount);
        console.log(result.map(patent => `${patent.PatentNumber} (${patent.PMCRef}) Claims: ${patent.Claims.map(claim => claim.ClaimNumber).join(', ')}`));
        if (downloadPats) downloadPatents(result, dropboxPath);
        const addedList = await createPatentQuery(connectParams, result);
        //win.webContents.send('new_patents_ready', idList))
        console.log(addedList);
        return resolve(addedList)
    } catch (err) {
        return reject(err)
    }
});





connectDocker({
    "userName": "sa",
    "password": "8ill5Sql",
    "options": {
        "database": "GeneralResearch"
    }
})
    .then(params => {
        connectParams = Object.assign(params);
        return writeNewPatents([], 'TEST', '//Bills Swap', false, 2)
    })
    .then(result => console.log(result))
    .catch(err => console.error(err));

