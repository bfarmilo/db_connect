const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const path = require('path');
const expect = chai.expect;
const { getAllImages } = require('../jsx/getImages.js')

const patentNo = '7769344';

// A simple test to verify a visible window is opened with a title
chai.use(chaiAsPromised);

describe('it can get a page number from a section', () => {
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
    it('can put it all together and do it automatically', async () => {
        imageMap = new Map(await getAllImages(patentNo));
        expect(imageMap.size).to.equal(22);
        expect(imageMap.has(52)).to.be.true;
        expect(imageMap.has(53)).to.be.false;
        return console.log(imageMap.get(50));
    })

})