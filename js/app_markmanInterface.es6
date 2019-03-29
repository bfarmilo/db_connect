const { getMarkmanDropdowns, insertAndGetID, getClaimDropdown, getPatentFromDigits } = require('../jsx/app_bulkUpload');
const connectParams = require('../app_config.json').patentDB.connection;
const { connectDocker } = require('../jsx/connectDocker');
const { dialog } = require('electron');


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
        requiredKeys = ['term'];
    }
    if (mode === 'construction') {
        requiredKeys = ['construction'];
    }
    if (mode === 'link') {
        requiredKeys = ['constructID', 'termID', 'claimID'];
    }
    if (mode === 'modify') {
        requiredKeys = ['constructID', 'termID', 'claimID']
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
 * Will initialized the database with placeholders if needed
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
 * @param digits - any number of digits used to search by Patent Number
 * @returns {Map[number,number]} where key=Patent Number and value=PatentID
 */
const getPatents = (connectParams, digits) => {
    return getPatentFromDigits(connectParams, digits)
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
 * add a new term, construction and link between them
 * @param connectParams 
 * @param {String} mode -> 'term', 'construction', or 'link' 
 * @param {Object} data 'term' mode: {term}, 'construction' mode: {construction, <documentID>, <page>, <agreed>, <court>}, 'link' mode:{constructID, termID, claimID, <clientID>}
 * @returns {Promise} resolving to an ID
 */
const addMarkman = async (connectParams, mode, data) => {

    const { terms, constructions, documents, clients, claims } = tableSchema;
    if (!passesSchema(mode, data)) return Promise.reject('data does not have the required keys')
    // get (or create if not exists) a term from the terms table and return a termID.
    if (mode === 'term') return insertAndGetID(connectParams, terms.table, { ClaimTerm: data.term }, terms.index);
    // force-create a new construction since all of the other fields (document, etc.) are in this table
    if (mode === 'construction') return insertAndGetID(
        connectParams,
        constructions.table,
        { Construction: data.construction, [documents.index]: data.documentID || DOC_PLACEHOLDER, MarkmanPage: data.page || 0, Agreed: data.agreed || 0, Court: data.court || '' },
        tableSchema.constructions.index,
        {
            readOnly: false
        });
    if (mode === 'link') return insertAndGetID(
        connectParams,
        'MarkmanTermConstruction',
        {
            [constructions.index]: data.constructID,
            [terms.index]: data.termID,
            [clients.index]: data.clientID || CLIENT_PLACEHOLDER,
            [claims.index]: data.claimID,
        },
        'TermConstructionID',
        { readOnly: false }
    )
}

/**
 * modifyMarkman changes value in a markman table
 * @param connectParams 
 * @param {Object} record {constructID, termID, claimID, <term>, <construction>, <documentID>, <page>, <agreed>, <court>, <clientID>}
 * @returns
 */
const modifyMarkman = async (connectParams, record, collection) => {
    const { terms, constructions, clients } = tableSchema;
    const recordKeys = Object.keys(record);
    if (!passesSchema('modify', data)) return Promise.reject('data does not have the required keys');
    // figure out which tables need to change based on contents of record
    // term -- MarkmanTerm
    if (recordKeys.includes('term')) {
        await insertAndGetID(connectParams, terms.table, {
            TermID: termID,
            ClaimTerm: term
        }, terms.index, { updateFields: ['ClaimTerm'] })
    }
    // clientID -- MarkmanTermConstruction
    if (recordKeys.includes('clientID')) {
        await insertAndGetID(connectParams, 'MarkmanTermConstruction', {

        }, '')
    }
    // construction, documentID, page, agreed, court -- MarkmanConstruction
    if (['construction', 'documentID', 'page', 'agreed', 'court'].reduce((result, key) => {
        if (!recordKeys.includes(key)) result.push(key);
        return result;
    }, []).length) {

    }
}

const linkDocument = async (connectParams, DropboxPath, ClientID) => {
    //TODO does this return an array or a single value?
    const clientSectorIDs = await insertAndGetID(connectParams, 'ClientSector', { ClientID }, 'ClientSectorID', { readOnly: true });
    // really only care about one
    const { ClientSectorID } = clientSectorIDs !== 'not found' ? clientSectorIDs : { ClientSectorID: 1 };
    dialog.showOpenDialog({
        title: 'Select a Ruling',
        defaultPath: DropboxPath,
        properties: 'openFile'
    }, filePath => {
        const [DocumentPath, ignore, FileName] = filePath.split(DropboxPath)[1].match(/\\(.*\\(.*))/);
        const DateModified = fs.statSync(`${DropboxPath}/${DocumentPath}`).mtime;
        // now return the documentID, or write a new one if needed
        // when checking if it exists, just use documentpath
        // if writing a new one, skip the 'Comments' field
        return insertAndGetID(
            connectParams,
            tableSchema.table.documents,
            { DocumentPath, FileName, DateModified, DocumentTypeID: DOCTYPE_PLACEHOLDER, ClientSectorID },
            tableSchema.documents.index,
            { skipWrite: ['Comments'], skipCheck: ['DateModified', 'DocumentTypeID', 'ClientSectorID', 'FileName'] }
        )
    });
}

/*
Need to insert
mt: TermID, ClaimTerm
clients: ClientID, ClientName, SugarID
documents: DocumentID, DocumentPath, DocumentType, FileName, ClientSectorID, DateModified, Comments
    ClientSector: ClientSectorID, ClientID, SectorID
        Sector: SectorID, SectorName
mc: ConstructID, Construction, DocumentID, MarkmanPage, Agreed (BOOL), Court
mtc: TermID, ClaimID, ConstructID, ClientID
 
Sequence looks like:
1) Get ClientID: SELECT ClientID, ClientName FROM clients to populate a dropdown
If 'Other':
    1.1) INSERT INTO clients (ClientName, SugarID) VALUES ([clientName], 99)
    1.2) Get sector from user SELECT * FROM Sector to populate dropdown
    1.3) SELECT ClientID from clients WHERE ClientName = [clientName] 
    1.4) INSERT INTO ClientSector (ClientID, SectorID) VALUES ([clientID], [sectorID])
2) Get DocumentID: SELECT DocumentID FROM documents WHERE DocumentPath=[documentPath]
If not found:
    2.1) Steps to insert a document
3) Get ClaimID: SELECT ClaimID FROM claims INNER JOIN Patents AS patents ON patents:PatentID = claims:PatentID WHERE patents.PatentNumber=[patentNumber] AND claims.claimNumber=[claimNumber]
4) Lookup TermID: SELECT * FROM mt WHERE ClaimTerm=[claimTerm]
if new:
    4.1) INSERT INTO mt (ClaimTerm) VALUES ([claimTerm])
    4.2) SELECT TermID FROM mt WHERE ClaimTerm=[claimTerm]
5) Enter Construction Data: INSERT INTO mc (Construction, DocumentID, MarkmanPage, Agreed, Court) VALUES ([construction], [documentID], [markmanPage], [agreed], [Court])
6) Link term and construction: INSERT INTO mtc (TermID, ClaimID, ConstructID, ClientID) VALUES([termID], [claimID], [constructID], [clientID])
 
UI Assumes you're working through a document
FilePath,  Court
[ClaimTerm ->
    [Patent, Claim 
        [Client -> 
            [Construction, MarkmanPage, Agreed]
        ]
    ]
]
*/

module.exports = {
    initializeMarkman,
    lookupIDs,
    getPatents,
    getClaims,
    addMarkman,
    modifyMarkman,
    linkDocument
}