const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
const { getAllImages } = require('../jsx/getImages.js');
// const { PatentImage } = require('../jsx/patentImageView.js');
const fse = require('fs-extra');

const patentNo = '7769344';
const applicationNo = '20090083813';
let patentImages = new Map();

// A simple test to verify a visible window is opened with a title
chai.use(chaiAsPromised);

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
        const imageMap = new Map(await getAllImages(patentNo));
        expect(imageMap.size).to.equal(22);
        expect(imageMap.has(52)).to.be.true;
        expect(imageMap.has(53)).to.be.false;
        await fse.writeFile(`./test/page50`,imageMap.get(50).pageData);
        return console.log(imageMap.get(50));
    });
    it('can get all images from the USPTO when given a valid application number', async function () {
        const imageMap = new Map(await getAllImages(applicationNo));
        expect(imageMap.size).to.equal(13);
        expect(imageMap.has(14)).to.be.true;
        expect(imageMap.has(15)).to.be.false;
        await fse.writeFile(`./test/page12`, imageMap.get(12).pageData);
        return console.log(imageMap.get(11));
    });
    it('fails gracefully when a matching document is not found', async function () {
        const imageMap = new Map(await getAllImages(10999999));
        expect(imageMap.size).to.equal(0);
        return console.log(imageMap)
    })
});

describe('it can write image data to the DB', function () {

});
describe('it can serve image data to the front-end', function () {

});
describe('it can read a PDF buffer and render on-screen', function () {
/*     const wrapper = shallow(<PatentImage imageData={patentImages.get(11)} showPage={11} rotation={0}/>);
    it('renders a canvas', () => {
        expect(wrapper.find('canvas').text()).to.equal('')
    }) */

});
