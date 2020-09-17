// TODO reparse for sqlite

const { connectDocker } = require('./connectDocker.es6');
const { insertAndGetID } = require('./app_bulkUpload.es6');
const fse = require('fs-extra');

const SLICE_SIZE = 1;

const patentDB = {
    connection: {
        container: "sqlserver",
        userName: "sa",
        password: "8ill5Sql",
        options: {
            database: "PMCDB",
            encrypt: true,
            port: 1433
        }
    }
}


let connection;

const connectToDB = async () => {
    try {
        return (await connectDocker(patentDB.connection));
    } catch (err) {
        return err;
    }
};

//Generic database writing function
const storeRecords = (table, dataList, skipCheck, skipWrite, updateFields) => {
    const getNextSlice = async start => {
        if (start > dataList.length) return;
        const options = {};
        if (skipCheck) options.skipCheck = skipCheck;
        if (skipWrite) options.skipWrite = skipWrite;
        if (updateFields) options.updateFields = updateFields;
        const result = await Promise.all(dataList.slice(start, start + SLICE_SIZE)
            .map(dataRecord => insertAndGetID(connection, table, dataRecord, `${table}ID`, options)));
        return getNextSlice(start + SLICE_SIZE);
    }

    try {
        return getNextSlice(0);
    } catch (err) {
        console.err(err)
    }
}
const importCSV = file => {
    const rows = file.replace(/\r\n/g, '\n').split('\n');
    const getColumn = row => row.split('||').map(elem => elem.trimStart());

    // get headers (keys) and drop it from the array of rows
    let keys = getColumn(rows.shift());

    // step through each row, get the column data and put it into JSON format
    return rows.map(row => getColumn(row).reduce((result, data, idx) => {
        const number = data.match(/^\d*$/);
        let value = data;
        if (data.match(/^\d.$/)) value = parseInt(data, 10);
        if (data.match(/FALSE/)) value = false;
        if (data.match(/TRUE/)) value = true;
        result[keys[idx]] = value;
        return result;
    }, {}))
}

const inputCSV = process.argv[2];
const mode = process.argv[3];

connectToDB()
    .then(params => {
        connection = { ...params };
        return fse.readFile(inputCSV, 'utf8')
    })
    .then(file => {
        const dataRecord = importCSV(file);
        let skipCheck, skipWrite, updateFields, table;
        switch (mode) {
            case 'patent':
                table = 'Patent';
                skipCheck = ['PatentUri', 'ClaimsCount', 'IndependentClaimsCount'];
                updateFields = ['PatentUri', 'ClaimsCount', 'IndependentClaimsCount'];
                skipWrite = false;
                break;
            case 'new':
                table = 'Claim';
                skipCheck = ['ClaimStatusID', 'ClaimHtml', 'IsDocumented'];
                skipWrite = false;
                updateFields = ['ClaimHtml'];
                break;
            case 'amended':
                table = 'Claim';
                skipCheck = ['ClaimHtml', 'ClaimStatusID'];
                updateFields = ['ClaimStatusID', 'ClaimHtml'];
                skipWrite = false;
                break;
            case 'examined':
                table = 'Claim';
                updateFields = ['ClaimStatusID'];
                skipCheck = ['ClaimStatusID'];
                skipWrite = false;
                break;
            default:
                console.log('invalid mode, use one of patent, new, amended or examined');
        }
        return storeRecords(table, dataRecord, skipCheck, skipWrite, updateFields);
    }).then(() => console.log('database work complete'))
    .catch(err => console.error(err));