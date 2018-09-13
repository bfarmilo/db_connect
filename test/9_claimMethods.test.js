const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;

const { getCurrent, modifyClaim, countResults, dropWorkingValue } = require('../js/claimListMethods.jsx');
const sample = require('./sampleResult.json');

const firstTable = getCurrent(sample, [], '7769344', '57', 'WatchItems');
const newTable = getCurrent(sample, firstTable, '7769344', '58', 'WatchItems');
const newNewTable = getCurrent(sample, newTable, '7783252', '61', 'PotentialApplication')
let testRecord;

describe('It extracts a matching record into workingTable', () => {
    it('adds a value to a blank table', () => {
        return expect(firstTable[0].value).to.equal('A')

    });
    it('returns a blank value when no value is present', () => {
        return expect(getCurrent(sample, [], '7769344', '58', 'WatchItems')[0].value).to.equal('')
    })
    it('appends multiple records from the same patent', () => {
        expect(newTable.length).to.equal(2);
        expect(newTable[0].patentNumber).to.equal(newTable[1].patentNumber);
        expect(newTable[0].value).to.not.equal(newTable[1].value);
    })
    it('skips adding if its already present', () => {
        expect(getCurrent(sample, newTable, '7769344', '58', 'WatchItems').length).to.equal(2)
    })
    it('pulls out a value if found', () => {
        expect(newTable.find(claim => claim.claimID === `57` && claim.field === 'WatchItems').value).to.equal('A');
    })
    it('gracefully passes a different value if not found', () => {
        const activeValue = newTable.find(claim => claim.claimID === `57` && claim.field === 'PotentialApplication');
        expect(activeValue ? activeValue.value : 'OK').to.equal('OK');
    })
    it('drops a working value based on claimID and field passed', () => {
        expect(dropWorkingValue(newNewTable, '61', 'PotentialApplication').table).to.have.same.members(newTable);
        expect(dropWorkingValue(dropWorkingValue(newTable, '58', 'WatchItems').table, '57', 'WatchItems').table).to.have.same.members([]);
    })
    it('returns the full record of the extracted item', () => {
        expect([dropWorkingValue(newNewTable, '57', 'WatchItems').value]).to.have.same.members(firstTable)
    })
});
describe('It inserts an updated record into the master list', () => {
    it('slices a value', () => {
        testRecord = { ...(dropWorkingValue(newNewTable, '57', 'WatchItems').value), value: 'new value set' };
        console.log(testRecord);
        console.log()
        return expect(modifyClaim(sample, 'update_set', testRecord).filter(item => item.PatentNumber === parseInt(testRecord.patentNumber,10))[0].claims.filter(item => item.ClaimID === parseInt(testRecord.claimID, 10))[0].WatchItems).to.equal(testRecord.value);
    })
})
