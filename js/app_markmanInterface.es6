const { getMarkmanDropdowns, insertAndGetID, getClaimDropdown, getPatentFromDigits } = require('../jsx/app_bulkUpload');
const connectParams = require('../app_config.json').patentDB.connection;
const { connectDocker } = require('../jsx/connectDocker');
const { dialog } = require('electron');
const fs = require('fs');

const tableSchema = {
    documents: { table: 'Document', index: 'DocumentID' },
    claims: { table: 'Claim', index: 'ClaimID' },
    patents: { table: 'Patent', index: 'PatentID' },
    terms: { table: 'MarkmanTerms', index: 'TermID' },
    constructions: { table: 'MarkmanConstructions', index: 'ConstructID' },
    clients: { table: 'Client', index: 'ClientID' },
    clientSectors: { table: 'ClientSector', index: 'ClientSectorID' }
}

let DOC_PLACEHOLDER;
const DOCTYPE_PLACEHOLDER = 8895;
let CLIENT_PLACEHOLDER;
let CLIENTSECTOR_PLACEHOLDER;


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


//1. Get Markman Dropdowns () => {claimTerms<Map term, termID>, clients<Map client, clientID>, sectors<Map sector, sectorID>}
//1.1 Add 'New' option to claimTerms
//2. Get DocumentID (browsetofile) => DocumentID <Optional>
//3. Get PatentID (last 3 digits) => PatentID
//4. Get claimdropdown (PatentID) => Map(claim number, claimID)

//A. 'New' claimTerm selected from dropdown (note some autocomplete would be good here)
//A.1 Add claimTerm to DB
//A.2 When user enters a construction, Add construction to DB
//A.3 Link term to construction, client, and claim

/**
 * populate some dropdowns, will initialize the database with placeholders if needed
 * @param connectParams 
 * @returns {Promise} resolving to {claimTerms:Map[term, termID], clients:Map[client, clientID], sectors:Map[sector, sectorID]}
 */
const initializeMarkman = async (connectParams) => {
    // make sure we have placeholder documents, clients, and clientsectors to satisfy 
    // foreign key constraints later. Will insert only once.
    const { documents, clients, clientSectors } = tableSchema;
    const hasPlaceHolderClient = await insertAndGetID(
        connectParams,
        clients.table,
        { ClientName: 'unknown', SugarID: 21 },
        clients.index,
        { readOnly: false }
    )
    CLIENT_PLACEHOLDER = hasPlaceHolderClient[clients.index];

    const hasPlaceHolderClientSector = await insertAndGetID(
        connectParams,
        clientSectors.table,
        { [clients.index]: CLIENT_PLACEHOLDER, SectorID: 7 },
        clientSectors.index,
        { readOnly: false }
    )
    CLIENTSECTOR_PLACEHOLDER = hasPlaceHolderClientSector[clientSectors.index];

    const hasPlaceHolderDoc = await insertAndGetID(
        connectParams,
        documents.table,
        {
            DocumentPath: '',
            DocumentTypeID: DOCTYPE_PLACEHOLDER,
            FileName: '.placeholder',
            DateModified: (new Date()).toISOString(),
            Comments: '',
            ClientSectorID: CLIENTSECTOR_PLACEHOLDER
        },
        documents.index,
        {
            skipCheck: ['DocumentID', 'DocumentPath', 'DocumentTypeID', 'DateModified', 'Comments', 'ClientSectorID'],
            skipWrite: ['Comments']
        })
    DOC_PLACEHOLDER = hasPlaceHolderDoc[documents.index];

    return getMarkmanDropdowns(connectParams);
}

/**
 * 
 * @param connectParams 
 * @param query 
 * @param collection 
 * @returns {Promise} resolving to {type, [index]}
 */
const lookupIDs = (connectParams, query, collection) => {
    const { table, index } = tableSchema[collection];
    // query has the form {column:value}
    return insertAndGetID(connectParams, table, query, index, { readOnly: true });
}


/**
 * 
 * @param connectParams 
 * @param PatentID - a valid PatentID
 * @returns {Map[number, number]} where key=Claim Number and value=ClaimID
 */
const getClaims = (connectParams, PatentID) => {
    return getClaimDropdown(connectParams, PatentID);
}

/**
 * add a new term, construction or link between them
 * @param connectParams 
 * @param {String} mode -> 'term', 'construction', or 'link' 
 * @param {Object} data 'term' mode: {term}, 'construction' mode: {construction, <documentID>, <page>, <agreed>, <court>}, 'link' mode:{constructID, termID, claimID, <clientID>}
 * @returns {Promise} resolving to an ID
 */
const addMarkman = async (connectParams, mode, data) => {
    const { terms, constructions, documents, clients } = tableSchema;
    if (!passesSchema(mode, data)) return Promise.reject('data does not have the required keys');
    const record = { ...data };
    // get (or create if not exists) a term from the terms table and return a termID.
    if (mode === 'term') return insertAndGetID(connectParams, terms.table, record, terms.index);
    // create a new construction since all of the other fields (document, etc.) are in this table
    if (mode === 'construction') return insertAndGetID(
        connectParams,
        constructions.table,
        {
            ...record,
            [documents.index]: data[documents.index] || DOC_PLACEHOLDER,
            MarkmanPage: data.MarkmanPage || 0,
            Agreed: data.Agreed || 0,
            Court: data.Court || ''
        },
        tableSchema.constructions.index,
        { readOnly: false }
    );
    if (mode === 'link') return insertAndGetID(
        connectParams,
        'MarkmanTermConstruction',
        { ...record, [clients.index]: data[clients.index] || CLIENT_PLACEHOLDER },
        'TermConstructionID',
        { readOnly: false }
    );
}

/**
 * modifyMarkman changes value in one or more markman tables 
 * @param connectParams 
 * @param {Object} record {ConstructID, TermID, ClaimID, <ClaimTerm>, <Construction>, <DocumentID>, <MarkmanPage>, <Agreed>, <Court>, <ClientID>}
 * @returns
 */
const modifyMarkman = async (connectParams, record) => {
    const { terms, constructions } = tableSchema;
    const recordKeys = Object.keys(record);
    if (!passesSchema('modify', data)) throw('data does not have the required keys');
    // figure out which tables need to change based on contents of record
    // term -- MarkmanTerm
    if (recordKeys.includes('ClaimTerm')) {
        await insertAndGetID(connectParams, terms.table, {
            [terms.index]: record[terms.index],
            ClaimTerm: record.ClaimTerm
        }, terms.index, { updateFields: ['ClaimTerm'] })
    }
    // construction, documentID, page, agreed, court -- MarkmanConstruction
    const constructionKeys = ['Construction', 'DocumentID', 'MarkmanPage', 'Agreed', 'Court'].reduce((result, key) => {
        if (recordKeys.includes(key)) result.push(key);
        return result;
    }, [])
    if (constructionKeys.length) {
        const constructionRecord = [constructions.index].concat(constructionKeys).reduce((result, key) => {
            result[key] = record[key];
            return result;
        }, {});
        await insertAndGetID(connectParams, constructions.table, constructionRecord, constructions.index, { updateFields: constructionKeys })
    }
    // clientID -- MarkmanTermConstruction, and return a {TermConstructID, 'existing'} record
    if (recordKeys.includes('ClientID')) {
        const { TermConstructID } = await insertAndGetID(connectParams, 'MarkmanTermConstruction', { TermConstructID: record.TermConstructID, ClientID: record.ClientID }, 'TermConstructID', { updateFields: ['ClientID'] })
    }
    return record.TermConstructID || TermConstructID;
}

const linkDocument = (connectParams, DropboxPath, client, ClientID) => new Promise(async (resolve, reject) => {
    try {
        let document;
        //TODO does this return an array or a single value?
        const clientSectorIDs = await insertAndGetID(connectParams, 'ClientSector', { ClientID }, 'ClientSectorID', { readOnly: true });
        // really only care about one
        const { ClientSectorID } = clientSectorIDs !== 'not found' ? clientSectorIDs : { ClientSectorID: 1 };
        dialog.showOpenDialog({
            title: 'Select a Ruling',
            defaultPath: `${DropboxPath}PMC Public\\PMC ASSETS\\PMC Patents\\Claim Construction`,
            properties: ['openFile']
        }, async ([filePath]) => {
            const [fullPath, DocumentPath, FileName] = filePath.split(DropboxPath)[1].match(/(.*\\(.*))/);
            const DateModified = (new Date(fs.statSync(`${DropboxPath}${DocumentPath}`).mtimeMs)).toISOString();
            document = FileName;
            // now return the documentID, or write a new one if needed
            // when checking if it exists, just use documentpath
            // if writing a new one, skip the 'Comments' field
            const docResult = await insertAndGetID(
                connectParams,
                tableSchema.documents.table,
                { DocumentPath, FileName, DateModified, DocumentTypeID: DOCTYPE_PLACEHOLDER, ClientSectorID },
                tableSchema.documents.index,
                { skipWrite: ['Comments'], skipCheck: ['DateModified', 'DocumentTypeID', 'ClientSectorID', 'FileName'] }
            );
            return resolve({ documentID: docResult[tableSchema.documents.index], document });
        })
    } catch (err) {
        return reject(err)
    }
});


module.exports = {
    initializeMarkman,
    lookupIDs,
    getClaims,
    addMarkman,
    modifyMarkman,
    linkDocument
}