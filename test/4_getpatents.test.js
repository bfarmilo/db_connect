const fse = require('fs-extra');
const { getPatentData, getClaimData, downloadPatents } = require('../js/getpatents');
const outputFile = './test/patentRecord.json';
const { getDropBoxPath } = require('../js/getDropBoxPath');

let basePath = process.argv[2] || 'PMC Public\\Licensing\\PMC Patents OCR\\';
let patentRef = process.argv[3] || 'NAVI 81B';
const useIdx = process.env.USEDB === 'NextIdea';
const uriMode = useIdx;

const patentList = [
    9294205
]

patentList.sort();

getDropBoxPath((err, dropBox) => {
    if (err) {
        console.error(err)
    } else {
        console.log('got dropbox path %s', dropBox);
        Promise.all(patentList.map((pat, idx) => getPatentData(pat, `${patentRef}${useIdx ?` ${idx+1}` : ''}`, dropBox, basePath, uriMode, true)))
            .then(result => fse.writeJSON(outputFile, { Patents: result }))
            .then(() => console.log('file successfully written'))
            .catch(err => console.error(err));
    }
})


