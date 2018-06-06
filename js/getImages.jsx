import fetch from 'node-fetch';

// sample url from USPTO
/* The 'Images' section (section 2)
http://pdfpiw.uspto.gov/.piw?docid=04359631&SectionNum=2&IDKey=165AC4AD915E&HomeUrl=http://patft.uspto.gov/netacgi/nph-Parser?Sect1=PTO1%2526Sect2=HITOFF%2526d=PALL%2526p=1%2526u=%25252Fnetahtml%25252FPTO%25252Fsrchnum.htm%2526r=1%2526f=G%2526l=50%2526s1=4359631.PN.%2526OS=PN/4359631%2526RS=PN/4359631

generates an embed 
http://pdfpiw.uspto.gov/31/596/043/1.pdf

So to get the page corresponding to the drawings, need to go to SectionNum=3, get the PageNum parameter, subtract 1

note this parses to
fetch(`http://pdfpiw.uspto.gov${docID.replace(/(\d{3})(\d{3})(\d{2})/g, "/$3/$2/$1/")}7.pdf`).then(result => console.log(result))

TODO: Store the docid with the database for later image retrieval

*/


/** getAllImages retrieves the PDF data for each page, from 2 to the end of the images section
 * 
 * @param {string} documentID -> the string or number documentID from the USPTO corresponding to the patent
 * @returns {Array<[number, blob]>} -> a nested array of page number, pdf data suitable for conversion into a Map
 */
const getAllImages = async documentID => {

    /** Helper function to get the page number associated with the start of a section
     * Section 3 is usually used, since section 2 is the image section
     * @param {number} section
     * @returns {number} -> the page number of the end of the prior section, or 0 if not present
     */
    const findEndPage = async section => {
        const sectionPage = await (await fetch(`http://pdfpiw.uspto.gov/.piw?docid=${documentID}&SectionNum=${section}`)).text();
        return sectionPage.match(/PageNum=(\d+?)/i)[1] || '0';
    }
    
    /** Helper function to retrieve the pdf blob for a given page
     * 
     * @param {*} pageNum
     * @returns {[number, blob]} -> an array of [page number, pdf data] for the single page
     */
    const getImage = async pageNum => {
        const imageData = await (await fetch(`http://pdfpiw.uspto.gov${documentID.replace(/(\d{3})(\d{3})(\d{2})/g, "/$3/$2/$1/")}${pageNum}.pdf`)).text()
        return [pageNum, imageData];
    }

    // the main function. Create an array of page numbers eg. [2, 3, 4, 5] corresponding to the image pages
    const pageNumbers = (new Array(await findEndPage(3)-2)).fill(0).map((item,idx) => idx+2);
    // then run getImage over that array
    return [...await Promise.all(pageNumbers.map(getImage))];
}

module.exports = {
    getAllImages
}