import fetch from 'electron-fetch';
import { uspto } from '../app_config.json';

// sample url from USPTO
/* The 'Images' section (section 2)
http://pdfpiw.uspto.gov/.piw?docid=04359631&SectionNum=2 (patent)
http://pdfaiw.uspto.gov/.aiw?docid=20090083813&SectionNum=2 (application)


generates an embed 
http://pdfpiw.uspto.gov/31/596/043/1.pdf (patent)
http://pdfaiw.uspto.gov/13/2009/38/008/1.pdf (application) from 20090083813

So to get the page corresponding to the drawings, need to go to SectionNum=3, get the PageNum parameter, subtract 1

note this parses to
`http://pdfpiw.uspto.gov${docID.replace(/(\d{3})(\d{3})(\d{2})/g, "/$3/$2/$1/")}/${pageNum}.pdf` (patent)
`http://pdfaiw.uspto.gov${patentNumber.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/g, "/$4/$1/$3/$2")}/${pageNum}.pdf` (application)

TODO: Write a front-end (new window for Image display)

*/


/** getAllImages retrieves the PDF data for each page, from 2 to the end of the images section
 * 
 * @param {string} patentNumber -> the string or number documentID from the USPTO corresponding to the patent
 * @returns {Array<[{ PageNumber{number}, ImageURL{string}, PageData{buffer}}]>} -> a nested array of page number, pdf data suitable for conversion into a Map
 */
const getAllImages = async patentNumber => {

    const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:77.0) Gecko/20100101 Firefox/77.0" };

    const docType = /\d{11}/g.test(`${patentNumber}`) ? 'application' : 'patent';
    const docNumber = (docType === 'application') ? `${patentNumber}` : (patentNumber < 10000000) ? `0${patentNumber}` : `${patentNumber}`;

    /** Helper function to get the page number associated with the start of a section
     * Section 3 is usually used, since section 2 is the image section
     * @param {number} section
     * @returns {number} -> the page number of the end of the prior section, or 0 if not present
     */
    const findEndPage = async section => {
        const sectionPage = await (await fetch(`${uspto[docType].images.baseUrl}${uspto[docType].images.url}${docNumber}&SectionNum=${section}`, { headers })).text();
        return parseInt(sectionPage.match(/PageNum=(\d+)/i)[1], 10) || 0;
    }

    /** Helper function to retrieve the pdf blob for a given page
     * 
     * @param {*} PageNumber
     * @returns {[number, {url:string, pageData:base64 string}]} -> an array of [page number, {online link, local data}] for the single page
     */
    const getImage = async PageNumber => {
        const matchPattern = new RegExp(uspto[docType].images.matchPattern, 'g');
        const ImageURL = `${uspto[docType].images.baseUrl}${docNumber.replace(matchPattern, uspto[docType].images.replacePattern)}${PageNumber}.pdf`;
        const PageData = (await (await fetch(ImageURL, { headers })).buffer()).toString('base64');
        return { PageNumber, ImageURL, PageData };
    }

    try {
        // the main function. Create an array of page numbers eg. [2, 3, 4, 5] corresponding to the image pages
        const imageStart = await findEndPage(2);
        const imageEnd = await findEndPage(3);
        if (!imageStart && !imageEnd) return new Error('document not found');
        // create an array of page numbers
        const pageNumbers = (new Array(imageEnd - imageStart)).fill(0).map((item, idx) => idx + imageStart);
        // then run getImage over that array
        return [...await Promise.all(pageNumbers.map(getImage))];
    } catch (err) {
        return err;
    }
}

module.exports = {
    getAllImages
}