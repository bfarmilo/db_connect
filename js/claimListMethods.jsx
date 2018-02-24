/** Finds the value and index of the record matching PatentNumber and returns it
 * 
 * @param {Array<records>} claimTable
 * @param {Array<workingrecords>} workingTable
 * @param {Number} patentNumber
 * @param {Number} claimID
 * @param {string} field - the field to update
 * @returns {Array<workingrecords>}
 */
const getCurrent = (claimTable, workingTable, claimID, field) => {
    const claimIndex = claimTable.findIndex(claim => `${claim.ClaimID}` === claimID);
    const matchClaim = (claimIndex > -1) ? {
        patentNumber: claimTable[claimIndex].PatentNumber,
        index: claimIndex,
        claimID,
        field,
        value: claimTable[claimIndex][field] || ''
    } : '';
    if (!workingTable.find(item => item.claimID === claimID && item.field === field)) return workingTable.concat(matchClaim)
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
        recordToChange[sliceRecord.field] = sliceRecord.value;
        const returnTable = Object.assign([], claimTable);
        returnTable.splice(sliceRecord.index, 1, recordToChange);
        return returnTable;
    }

    // else operate on the full dataset, all claims, or toggle one
    return claimTable.map(item => {
        if (sliceRecord.claimID !== 'all' && item.ClaimID === parseInt(sliceRecord.claimID, 10)) return { ...item, [sliceRecord.field]: !item[sliceRecord.field] }
        return { ...item, [sliceRecord.field]: setValue };
    });
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
    dropWorkingValue,
    simpleHash
}