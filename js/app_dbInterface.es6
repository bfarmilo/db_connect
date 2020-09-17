// new code
const Database = require('better-sqlite3');
const path = require('path');

/// *** LEGACY INTERFACES ***
// TODO - port this over
const { queryDatabase } = require('./app_DBconnect');
// TODO - port this over, check to see if this is DB functions or not
const { parseQuery, parseOrder, parseOutput, flatten } = require('./app_sqlParse');
// TODO - port this over
const { insertAndGetID, getTermConstructions, getConstructions, getMarkmanDropdowns, getClaimDropdown, getPatentFromDigits, insertNewPatents, insertClaims, updatePatents } = require('./app_bulkUpload');
// TODO - phase this out
const { connectDocker, closeDocker } = require('./connectDocker');
// TODO - Probably can break this up, it is kind of a hybrd between db mid-level interface
const { initializeMarkman, lookupIDs, getClaims, addMarkman, modifyMarkman, linkDocument } = require('./app_markmanInterface');

// global variables
let database = null;
const options = {};
let uriMode;

function getDBInfo(db, options = {}) {

    const fileName = db.databases[db.connection.options.database].file;

    const defaultOptions = {
        testMode: false,
        initialData: false,
        master: [
            'resources',
            fileName
        ],
        local: [
            process.env.APPDATA || process.env.HOME,
            'IP Intern',
            fileName

        ],
        testMaster: [
            'test',
            `test_${fileName}`
        ],
        testLocal: [
            process.env.APPDATA || process.env.HOME,
            'dbviewer',
            `test_${fileName}`
        ],
    }

    // load options, overwriting defaults with user supplied options
    const dbOptions = { ...defaultOptions, ...options };
    const { testMode } = dbOptions;
    // resolve the path to the db, based on user or default options. normalize removes any .. and . and converts all to backslashes. 
    const masterPath = path.normalize(`${[appPath].concat(testMode ? dbOptions.testMaster : dbOptions.master).join('/')}`).replace(/\\/g, '/');
    const localPath = path.normalize(`${(testMode ? dbOptions.testLocal : dbOptions.local).join('/')}`).replace(/\\/g, '/');
    return { masterPath, localPath, dbOptions }
}

function connectToDB(db, userOptions=null) {

    const { localPath, dbOptions } = getDBInfo(db);
    database = new Database(localPath, userOptions?.options ? userOptions.options : {});
    const uriMode = db.databases[connectParams.options.database].uriMode;
    options = { ...dbOptions };
}

/** Database operations */

/** get the path to the master DB
 * @returns {String} path to master DB
 */
function getMasterPath() {
    return getDBInfo(db).masterPath;
}

/** get the path to the local DB
 * @returns {String} path to local DB
 */
function getLocalPath() {
    return getDBInfo(db).localDBPath;
}

/** close the database instance
 * 
 */
function closeDB() {
    database.close();
}


// ***DOCKER CONTAINER***
// TODO - port this out
const connectToDB = async db => {
    try {
        const connectParams = await connectDocker(db.connection);
        const uriMode = db.databases[connectParams.options.database].uriMode;
        console.log(`new connection parameters set: ${JSON.stringify(connectParams)}`);
        return { connectParams, uriMode };
    } catch (err) {
        throw err;
    }
};


// TODO -port this out
// close sql server connection
const closeDB = connect => {
    return closeDocker(connect);
}

// *** MARKMAN INTERFACE ***

const tableSchema = {
    documents: { table: 'Document', index: 'DocumentID' },
    claims: { table: 'Claim', index: 'ClaimID' },
    patents: { table: 'Patent', index: 'PatentID' },
    terms: { table: 'MarkmanTerms', index: 'TermID' },
    constructions: { table: 'MarkmanConstructions', index: 'ConstructID' },
    clients: { table: 'Client', index: 'ClientID' },
    clientSectors: { table: 'ClientSector', index: 'ClientSectorID' }
}

/**
 * @private
 * @param {String} mode 'term', 'construction', 'link', or 'modify' 
 * @param {Object} payload -> {column:value}
 * @returns {Boolean} true unless fails schema 
 */
const passesSchema = (mode, payload) => {
    const keys = Object.keys(payload);
    let requiredKeys;
    if (mode === 'term') {
        requiredKeys = ['ClaimTerm'];
    }
    if (mode === 'construction') {
        requiredKeys = ['Construction'];
    }
    if (mode === 'link') {
        requiredKeys = ['ConstructID', 'TermID', 'ClaimID'];
    }
    if (mode === 'modify') {
        requiredKeys = ['ConstructID', 'TermID', 'ClaimID']
    }
    return requiredKeys.reduce((result, key) => {
        if (!keys.includes(key)) return result && false;
        return result;
    }, true);
}

// *** PATENTS UPLOAD ***

/** createPatentQuery is an async function that maps the array of records
 * into arrays of promises that resolve to queries that write to the DB
 * 
 * @param {Object} params connection Parameters 
 * @param {*} patentList Array of patentRecord objects
 * @param {Function} update Callback to pass update information back to the front-end
 * @param {Object} claimFilter Used to filter out certain claims, eg claim 1 only or independent only
 * @returns {Object[]}
 */
const createPatentQuery = (params, patentList, update, claimFilter = false) => new Promise(async (resolve, reject) => {

    const filterTest = claim => !claimFilter || !!claim[claimFilter.field].toString().match(claimFilter.value);

    try {
        const result = await Promise.all(patentList.map(patent => insertNewPatents(params, patent, () => update(patent.PatentNumber, 'patent inserted')))).catch(err => {
            console.error('error writing patent record', err);
            return reject(err);
        });
        // result is an array of [{Claims:[claimRecords]}, ...]
        console.log('patent data written, writing claims', result.map(patent => `${patent.Claims.filter(filterTest).map(claim => claim.ClaimNumber).join(', ')}`));
        const claims = flatten(result.map(patent => patent.Claims));
        const summary = await Promise.all(claims.filter(filterTest).map(claim => insertClaims(params, claim))).catch(err => {
            console.error('error writing claims')
            return reject(err);
        });
        patentList.map(patent => update(patent.PatentNumber, 'claims inserted'));
        return resolve(summary);
        // returns an array of {[{PatentID, ClaimNumber}]}
    } catch (err) {
        return reject(err);
    }
})

module.exports = {
    insertAndGetID, getTermConstructions, getConstructions, getMarkmanDropdowns, getClaimDropdown, getPatentFromDigits,
    initializeMarkman, lookupIDs, getClaims, addMarkman, modifyMarkman, linkDocument,
    queryDatabase,
    parseQuery, parseOrder, parseOutput,
    connectToDB,
    closeDB,
    tableSchema,
    passesSchema,
    createPatentQuery
}