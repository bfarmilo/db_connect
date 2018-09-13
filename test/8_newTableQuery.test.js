const dbquery = require('../js/app_DBconnect');
const { parseQuery } = require('../js/app_sqlParse');
const { connectDocker } = require('../js/connectDocker');

let connectParams;

const query = {
    PMCRef: 'VIEW|DOWN&ASRE&OPNS|MKTR',
    PatentNumber: '332',
    IsInIPR: '',
    ClaimNumber: '',
    ClaimHtml: 'storage&transmitter',
    PotentialApplication: '',
    WatchItems: '',
    IsMethodClaim: '',
    IsDocumented: '0',
    IsIndependentClaim: ''
}

connectDocker(require('../js/app_config.json').patentDB.connection)
    .then(params => {
        connectParams = params;
        //remove duplicates and create an array of ({field, value}) objects
        const fieldList = Object.keys(query).filter(item => query[item] !== '').map(item => ({ field: item, value: query[item] }));
        //console.log('start:', fieldList);
        console.log('end: ',JSON.stringify(parseQuery(fieldList),null,1));

/*         dbquery(connectParams, 'p_SELECTJSON', `WHERE claims.ClaimNumber = @0 FOR JSON AUTO`, [1], (err, result) => {
            if (err) {
                console.error(err);
            } else {
                const claimList = JSON.parse(result.join('')).map(item => ({
                    PMCRef: item.PMCRef,
                    PatentPath: item.PatentPath,
                    PatentNumber: item.PatentNumber,
                    claims: item.claims.map(claim => ({ ...claim, editPA: false, editWI: false, expandClaim: false })),
                }));
                console.log(JSON.stringify(claimList, null, 1));
                //win.webContents.send('json_result', data);
            }
        }) */
    })
    .catch(err => console.error(err));

