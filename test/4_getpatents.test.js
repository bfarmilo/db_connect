const fse = require('fs-extra');
const { getPatentData, getClaimData } = require('../js/getpatents');
const outputFile = './test/patentRecord.json';
const { getDropBoxPath } = require('../js/getDropBoxPath');

let basePath = 'PMC Public\\Licensing\\NextIdea\\Topo.ai\\TAI Technologies_ Inc - Patent Library as of July 2017\\';
const patentList = [
    9619489,
    9497275,
    9485318,
    9479557,
    9443090,
    9436690,
    9369533,
    9317600,
    9307353,
    9258373,
    9077782,
    9077675,
    9055074,
    8990346,
    8862589,
    8850531,
    8849935,
    8655983,
    8655873,
    8639767,
    8612533,
    8595317,
    8484224
]

patentList.sort();

getDropBoxPath((err, dropBox) => {
    if (err) {
        console.error(err)
    } else {
        console.log('got dropbox path %s', dropBox);
        Promise.all(patentList.map((pat, idx) => getPatentData(pat, `TOPO.AI ${idx + 1}`, dropBox, basePath)))
            .then(result => fse.writeJSON(outputFile, { Patents: result }))
            .then(() => console.log('file successfully written'))
            .catch(err => console.error(err));
    }
})
