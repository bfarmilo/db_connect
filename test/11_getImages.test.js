const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
const { getAllImages } = require('../jsx/getImages.js');
const { insertAndGetID } = require('../jsx/app_bulkUpload');
const connectParams = require('../app_config.json').patentDB.connection;
const { connectDocker } = require('../jsx/connectDocker');
const { queryDatabase } = require('../jsx/app_DBconnect');
// const { PatentImage } = require('../jsx/patentImageView.js');
const fse = require('fs-extra');

const patentNo = '4694490';
const applicationNo = '20090083813';
let patentImages = new Map();
const ALLKEYS = [];
const READONLY = true;
let PatentID;

// A simple test to verify a visible window is opened with a title
chai.use(chaiAsPromised);

describe('getAllImages with DB Integration', function () {
    before(async function () {
        await connectDocker(connectParams);
        try {
            PatentID = await insertAndGetID(connectParams, 'Patent', { PatentURI: `%${patentNo}%` }, 'PatentID', { readOnly: true });
            console.log(PatentID);
        } catch (err) {
            console.error(err);
        }
    });
    describe('getAllImages', function () {
        /*     it('finds section 3', async () => {
                sectionTwoEnd = await findEndPage(docID, 3) - 1;
                console.log(sectionTwoEnd);
                return expect(sectionTwoEnd).to.match(/7/);
            });
            it('gets a pdf page and adds it to a Map', async () => {
                const testMap = new Map();
                testMap.set(... await getImages(docID, 8));
                return expect(testMap.has(8)).to.be.true;
            });
            it('can create a map of pdf pages', async () => {
                const testPages = new Map();
                for (let i = 2; i <= sectionTwoEnd; i++) {
                    testPages.set(...await getImages(docID, i));
                }
                console.log(...testPages.keys());
                return expect(testPages.size).to.equal(6);
            }); */
        it('can get all images from the USPTO when given a valid patent number', async function () {
            const result = await getAllImages(patentNo);
            const imageMap = new Map(result.map(image => [image.PageNumber, { ...image }]));
            expect(imageMap.size).to.equal(14);
            expect(imageMap.has(15)).to.be.true;
            expect(imageMap.has(16)).to.be.false;
            return console.log(imageMap.get(2));
        });
        it('can get all images from the USPTO when given a valid application number', async function () {
            const result = await getAllImages(applicationNo);
            const imageMap = new Map(result.map(image => [image.PageNumber, { ...image }]));
            expect(imageMap.size).to.equal(13);
            expect(imageMap.has(14)).to.be.true;
            expect(imageMap.has(15)).to.be.false;
            // await fse.writeFile(`./test/page12`, imageMap.get(12).pageData);
            return console.log(imageMap.get(12));
        });
        it('fails gracefully when a matching document is not found', async function () {
            const result = await getAllImages('10999999');
            const imageMap = new Map(result.map(image => [image.PageNumber, { ...image }]));
            expect(imageMap.size).to.equal(0);
            return console.log(imageMap)
        });
    });
    describe('insert images to DB', function () {
        it('writes images to the DB', async function () {
            const result = await getAllImages(patentNo);
            const imageRecords = result.map(image => ({ PatentID: PatentID && PatentID.PatentID, ...image }));
            const status = await Promise.all(imageRecords.map(imageRecord => insertAndGetID(connectParams, 'Images', imageRecord, 'ImageID', { skipCheck: ['PageData', 'Rotation'] })));
            expect(status[0]).not.to.equal('not found');
            expect(status[0]).to.haveOwnProperty('type');
            expect(status[0]).to.haveOwnProperty('ImageID');
            return console.log(JSON.stringify(status));
        });
    });

    describe('it can serve image data to the front-end', function () {
        it('checks to see if images associated with a patentID exist', async function () {
            const queryResult = () => new Promise((resolve, reject) => {
                queryDatabase(connectParams, 'p_IMAGES', `WHERE PatentID=@0`, [PatentID.PatentID], ' FOR JSON AUTO', (err, data) => {
                    if (err) return reject(err);
                    return resolve(data);
                });
            });
            const dataList = (await queryResult()).join('');
            expect(dataList).to.have.lengthOf(3);
            expect(dataList[0]).to.haveOwnProperty('ImageID');
        });
    });

    describe('it can read a PDF buffer and render on-screen', function () {
        /*     const wrapper = shallow(<PatentImage imageData={patentImages.get(11)} showPage={11} rotation={0}/>);
            it('renders a canvas', () => {
                expect(wrapper.find('canvas').text()).to.equal('')
            }) */

    });
});