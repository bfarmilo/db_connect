const { updatePatents } = require('../js/app_bulkUpload');
const { Patents } = require('./patentRecord.json');

Promise.all(Patents.map(x => {
    // PatentUri, PMCRef, Title, ClaimsCount, PatentNumber, IndependentClaimsCount, Number, IsInIPR,
    // TechnologySpaceID, TechnologySubSpaceID, CoreSubjectMatterID, PatentPath
    const value = x.PatentPath;
    return updatePatents('PatentPath', value, x.PatentUri)
}))
    .then(finish => console.log(finish))
    .catch(error => console.error(error));
