const { getFullText } = require('../js/getFullText.jsx');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised);

// test patent full text retrieval and application full text retrieval

describe('it can get full text for patents or applications from the USPTO', () => {
    [8856375, 20090083813, 9164831, 20170324769].map(doc => {
        it(`gets full text for a ${doc<99000000 ? 'patent' : 'application'}`, async () => {
            const docFullText = await getFullText(doc);
            console.log(`${docFullText.length} paragraphs found`);
            return expect(docFullText).to.be.instanceOf(Array);
        });
    });
});


// PTAB Pair Bulk Data
/*
PatentBulkData: [
    applicationDataOrProsecutionHistoryDataOrPatentTermData: [
        { ...
        partyBag: [
            {
                applicantBagOrInventorBagOrOwnerBag: [
                    ...
                    { inventorOrDeceasedInventor: [
                        {contactOrPublicationContact: [
                            {
                                name: {
                                personNameOrOganizationNameOrEntityName: [
                                    { personStructuredName: {
                                        firstName,
                                        middleName,
                                        lastName
                                    }}
                                ]}
                                cityName,
                                geographicRegionName: ...
                                countryCode
                            }
                        ],
                        sequenceNumber
                    }
                    ]}
                ]
            }
        ]}
    ]
]

*/

