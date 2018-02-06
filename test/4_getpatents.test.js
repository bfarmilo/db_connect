const fse = require('fs-extra');
const { getPatentData, getClaimData, downloadPatents } = require('../js/getpatents');
const outputFile = './test/patentRecord.json';
const { getDropBoxPath } = require('../js/getDropBoxPath');

// USAGE set USEDB=NextIdea & node ./test/4_getpatents.test.js [path_to_pdf] [PMC Ref]

let basePath = process.argv[2] || '\\Bills Swap\\' //'PMC Public\\PMC GENERAL\\Opportunities\\Single touch\\' || 'PMC Public\\Licensing\\PMC Patents OCR\\';
let patentRef = process.argv[3] || 'SINGLE' || 'NAVI 81B';
const useIdx = process.env.USEDB === 'NextIdea';
const uriMode = useIdx;

const patentList = [
    9380089,
    9350777,
    8825887,
    9349138,
    8554940,
    7191244,
    9380088,
    7054949,
    9135636,
    9135635,
    9026673,
    7689706

]

patentList.sort();

getDropBoxPath((err, dropBox) => {
    if (err) {
        console.error(err)
    } else {
        console.log('got dropbox path %s', dropBox);
        Promise.all(patentList.map((pat, idx) => getPatentData(pat, `${patentRef}${useIdx ?` ${idx+1}` : ''}`, dropBox, basePath, uriMode)))
            .then(result => {
                fse.writeJSON(outputFile, { Patents: result });
                return downloadPatents(result, dropBox);
            })
            .then(() => console.log('file successfully written'))
            .catch(err => console.error(err));
    }
})


