const { insertNewPatents, insertClaims } = require('../js/app_bulkUpload');
const { Patents } = require('./patentRecord.json');

Promise.all(Patents.map(x => {
    // PatentUri, PMCRef, Title, ClaimsCount, PatentNumber, IndependentClaimsCount, Number, IsInIPR,
    // TechnologySpaceID, TechnologySubSpaceID, CoreSubjectMatterID, PatentPath
    const values = `VALUES ('${x.PatentUri}','${x.PMCRef}','${x.Title}',${x.ClaimsCount},${x.patentNumber},${x.IndependentClaimsCount},'${x.Number}',${x.IsInIPR}, ${x.TechnologySpaceID},${x.TechnologySubSpaceID},${x.CoreSubjectMatterID},${x.PatentPath})`
    return insertNewPatents('u_INSERT', values, x.PatentUri)
}))
    .then(result => {
        return result.map(item => {
            //console.log(item);
            return Promise.all(Patents.filter(y => y.PatentUri === item.PatentUri)[0].Claims
            .map(claim => {
                console.log(item.PatentID, claim);
                return insertClaims(item.PatentID, claim);
            }))
            .then(finish => console.log(finish))
            .catch(error => console.error(error));
        })
    })
    .catch(err => console.error(err));

