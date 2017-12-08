const fse = require('fs-extra');
const { getPatentData, getClaimData } = require('../js/getpatents');

const patentList = [
    9749149, 9479475, 9282055, 8549607, 7975033
]

patentList.sort();

Promise.all(patentList.map((pat, idx) => getPatentData(pat, `MAZARICK ${idx+1}`)))
    .then(result => fse.writeJSON('./test/patentRecord.json', {Patents: result}))
    .then(() => console.log('file successfully written'))
    .catch(err => console.error(err));