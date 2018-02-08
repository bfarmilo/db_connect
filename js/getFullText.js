const fetch = require('node-fetch');
const uspto = require('./app_config.json').uspto;


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
    // form the url get string. The patentNumber shows up as TERM1
    let usptoURL = `${uspto.url}?TERM1=${patentNumber}&${Object.keys(uspto.queryParams).map(key => `${key}=${encodeURIComponent(uspto.queryParams[key])}`).join('&')}`;
    // the landing page redirects with new query parameters
    const redirectURL = await (await fetch(usptoURL)).text();
    // extract the query parameters from the landing page and fetch the redirected page, and return the cleaned result
    return cleanHTML(await (await fetch(`${usptoURL}${redirectURL.match(/\?(.*)(?="\>)/i)[1]}`)).text());;
}

module.exports = {
    getFullText
}