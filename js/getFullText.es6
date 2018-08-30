const fetch = require('node-fetch');
const uspto = require('../app_config.json').uspto;


const cleanHTML = (text) => {
    const start = new RegExp(uspto.startMatch, 'i');
    const end = new RegExp(uspto.endMatch, 'i');
    const lineBreak = new RegExp(uspto.breakMatch, 'g');
    const strip = new RegExp(uspto.stripMatch, 'g');
    //create a single string with no line breaks to ease next processing
    const fullText = text.replace(/\n/g, ' ');
    // now split out everything from just after 'Description' to '* * * * *', 
    // strip extra tags, split on lineBreaks into an array
    return fullText.slice((fullText.match(start).index + uspto.startMatch.length), fullText.match(end).index).replace(strip, '').split(lineBreak);
}

/** getFullText hits the USPTO website and returns an array of paragraphs
 * 
 * @param {number} patentNumber the patent Number of the full text to retrieve
 * @returns {Array<string>} One element per paragraph, otherwise completely clean of HTML formatting
 */
const getFullText = async (patentNumber) => {
    try {
        const docType = /\d{11}/g.test(`${patentNumber}`) ? 'application' : 'patent';
        let usptoURL;
        const { url, queryParams, redirectPattern } = uspto[docType];
        // form the url GET string. The patentNumber shows up as TERM1
        usptoURL = `${url}?TERM1=${patentNumber}&${Object.keys(queryParams).map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&')}`;
        // the landing page redirects with new query parameters
        const redirectURL = await (await fetch(usptoURL)).text();
        const redirPattern = new RegExp(redirectPattern, 'i');
        // extract the query parameters from the landing page and fetch the redirected page, and return the cleaned result
        return cleanHTML(await (await fetch(`${usptoURL}${redirectURL.match(redirPattern)[1]}`)).text());
    } catch (err) {
        return Promise.reject(err)
    }
}

module.exports = {
    getFullText
}