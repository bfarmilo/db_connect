/** Finds the value and index of the record matching PatentNumber and returns it
 * 
 * @param {Array<records>} claimTable
 * @param {Array<workingrecords>} workingTable
 * @param {Number} patentNumber
 * @param {Number} claimID
 * @param {string} field - the field to update
 * @returns {Array<workingrecords>}
 */
const getCurrent = (claimTable, workingTable, patentNumber, claimID, field) => {
    // get a reduced search set -- only those records with a matching patent number
    // sometimes a patent gets returned multiple times
    const matchingPatents = claimTable.reduce((accum, item, index) => {
        if (parseInt(item.PatentNumber, 10) === parseInt(patentNumber, 10)) {
            //look for a matching claim
            const matchClaim = item.claims.find(claim => `${claim.ClaimID}` === claimID);
            if (!!matchClaim) {
                accum = {
                    patentNumber,
                    index,
                    claimID,
                    field,
                    value: matchClaim[field] || ''
                }
            }
        }
        return accum;
    }, {});
    if (!workingTable.find(item => item.claimID === claimID && item.field === field)) return workingTable.concat(matchingPatents)
    return workingTable;
}

/** modifies a value within the claim List
 * 
 * @param {*} claimTable the claim table to edit
 * @param {*} changeType type of change - 'set', 'clear', 'resetAll', 'toggle', 'update_set', 'update_clear'
 * @param {*} sliceRecord an object containing at least {claimID:xx} (for toggle) but usually {patenNumber, index, claimID, field, value}
 */
const modifyClaim = (claimTable, changeType, sliceRecord = {}) => {

    const setValue = changeType.includes('set'); //true for 'set', false for 'clear'

    // updating a record - slice the new record into the table
    if (changeType.includes('update')) {
        const recordToChange = Object.assign({}, claimTable[sliceRecord.index]);
        const claimIndex = recordToChange.claims.findIndex(item => parseInt(item.ClaimID,10) === parseInt(sliceRecord.claimID,10));
        recordToChange.claims[claimIndex][sliceRecord.field] = sliceRecord.value;
        const returnTable = Object.assign([], claimTable);
        returnTable.splice(sliceRecord.index, 1, recordToChange);
        return returnTable;
    }

    // else operate on the full dataset, all claims, or toggle one
    return claimTable.map(item => ({
        ...item,
        claims: item.claims.map(claim => {
            if (sliceRecord.claimID !== 'all' && claim.ClaimID === parseInt(sliceRecord.claimID, 10)) return { ...claim, [sliceRecord.field]: !claim[sliceRecord.field] }
            return { ...claim, [sliceRecord.field]: setValue };
        })
    }));
}

const countResults = claimTable => {
    return claimTable.map(item => item.claims).reduce((total, claims) => total += claims.length, 0)
}


/** Helper function to extract a single matching record from an working table
 * returns the table minus the matching record and the value of the extracted record
 * 
 * @param {table} workingTable 
 * @param {string} claimID 
 * @param {string} field 
 * @returns {table:Array<records>, value:string}
 */
const dropWorkingValue = (workingTable, claimID, field) => {
    const remainingArray = Object.assign([], workingTable);
    return {
        table: remainingArray,
        value: remainingArray.splice(remainingArray.findIndex(item => (item.claimID === claimID && item.field === field)), 1)[0]
    }
}


/**Simple Hash function generator from the internet
 * @param {string} paragraph -> the text used to create the hash
 * @returns {string} -> hashed text
 */
const simpleHash = paragraph => {
    return [].reduce.call(paragraph, (p, c, i, a) => (p << 5) - p + a.charCodeAt(i), 0)
}

module.exports = {
    getCurrent,
    modifyClaim,
    countResults,
    dropWorkingValue,
    simpleHash
}