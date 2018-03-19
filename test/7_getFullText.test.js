const { getFullText } = require('../js/getFullText');


getFullText(8856375).then(result => console.log(result)).catch(err => console.error(err));

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

