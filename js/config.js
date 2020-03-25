module.exports = {
    config:
    {
        claims: {
            display: 'Claim',
            next: 'markman',
            gridTemplateColumns: '1fr 1fr 5fr 2fr 2fr',
            themeColor: 'rgba(51, 122, 183, 1)',
            selectedColor: 'rgba(183, 130, 51, 0.8)',
            borderColor: 'rgba(41, 94, 141, 0.8)',
            enabledButtons: [
                { display: 'App. Only', field: 'IsMethodClaim', setValue: '0' },
                { display: `Doc'd Only`, field: 'IsDocumented', setValue: '1' },
                { display: 'IPR Only', field: 'IsInIPR', setValue: '1' },
                { display: 'Claim 1 Only', field: 'ClaimNumber', setValue: '1' },
                { display: 'Ind. Only', field: 'IsIndependentClaim', setValue: '1' }
            ],
            columns: [
                { display: 'Reference', field: 'PMCRef' },
                { display: 'Patent', field: 'PatentNumber' },
                { display: 'Claim Full Text', field: 'ClaimHtml', hasDetail: true },
                { display: 'Notes', field: 'PotentialApplication' },
                { display: 'Watch', field: 'WatchItems' }
            ]
        },
        markman: {
            display: 'Construction',
            next: 'priorArt',
            gridTemplateColumns: '1fr 1fr 0.5fr 2fr 3fr 0.5fr 2fr 1fr 1fr',
            themeColor: 'rgba(106,142,99)',
            selectedColor: 'rgba(183, 130, 51, 0.8)',
            borderColor: 'rgba(41, 94, 141, 0.8)',
            enabledButtons: [],
            columns: [
                { display: 'Reference', field: 'PMCRef' },
                { display: 'Patent', field: 'PatentNumber' },
                { display: 'Clm.', field: 'ClaimNumber' },
                { display: 'Claim Term', field: 'ClaimTerm' },
                { display: 'Construction', field: 'Construction' },
                { display: 'Pg.', field: 'MarkmanPage' },
                { display: 'Ruling', field: 'FileName' },
                { display: 'Court', field: 'Court' },
                { display: 'Case', field: 'ClientName' }
            ]
        },
        priorArt: {
            display: 'Patent',
            next: 'claims',
            gridTemplateColumns: '1fr 1.5fr 1fr 3.5fr 2fr 2fr',
            themeColor: 'rgba(102, 0, 102, 1)',
            selectedColor: 'rgba(183, 130, 51, 0.8)',
            borderColor: 'rgba(41, 94, 141, 0.8)',
            enabledButtons: [],
            columns: [
                { display: 'Reference', field: 'PMCRef' },
                { display: 'Patent', field: 'PatentNumber' },
                { display: 'Inventor', field: 'InventorLastName' },
                { display: 'Title', field: 'Title' },
                { display: 'Summary', field: 'PatentSummaryText' },
                { display: 'Watch', field: 'WatchItems' }
            ]
        },
        databaseOptions: {
            PMCDB: {
                hideColumns: [
                    { field: 'InventorLastName' },
                    { field: 'Title' }
                ],
                enableConstructions: true
            },
            GeneralResearch: {
                hideColumns: [],
                enableConstructions: false
            }
        }
    }
}