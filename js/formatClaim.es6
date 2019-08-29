/**
 * 
 * @param {String} claimText a single plaintext claim
 * @returns {Object} {ClaimNumber, ClaimHTML, IsMethodClaim, IsDocumented, IsIndependentClaim, ClaimStatus, PatentID} 
 */
const formatClaim = (claimText, ClaimStatus = 1) => {
    // assume claim is formatted as per USPTO
    /*
    8.  A method of controlling a video presentation at least one receiver station of a plurality of receiver stations, said method comprising the steps of: transmitting a signal from an origination transmitter to a remote intermediate transmitter station, said signal including video and discrete signals for providing an instruct signal at said at least one receiver station, said instruct signal being operative at said at least one receiver station to instruct said at least one receiver station to at least one of generate and output a locally generated portion of said video presentation based on data specific to a user of said receiver station for display coordinated with said video, said data specific to a user being stored at said at least one receiver station prior to organizing information included in said discrete signals to provide said instruct signal, said locally generated portion including at least some information content that does not include any information from any of said signals, said at least some information content being subsequently displayed;  and transmitting at least one control signal from said origination transmitter to said remote intermediate transmitter station before a specific time, wherein said at least one control signal is effective at said remote intermediate transmitter station to control communication of said video and said instruct signal to said at least one receiver station.
    */
    // return an array of claim records
    /*       ClaimNumber
             ClaimHTML
             IsMethodClaim
             IsDocumented
             IsIndependentClaim
             ClaimStatus
             PatentID: 0 
    */
    // where ClaimHTML is URI-encoded and formatted in Google Patents form
    /* 
    <div class="claim[-dependent] style-scope patent-text">  
        <div id="CLM-00001" num="00001" class="claim style-scope patent-text">
            <div class="claim-text style-scope patent-text">1. A method for receiving and processing remotely originated and user specific data for use with a video apparatus, said video apparatus having a video output device for displaying a video presentation comprising a locally generated image and an image received from a remote video source, said method comprising the steps of:
                <div class="claim-text style-scope patent-text">receiving said user specific data at said video apparatus, said user specific data being specific to a user of said video apparatus;</div>
                <div class="claim-text style-scope patent-text">contacting a remote data source after said step of receiving said user specific data;</div>
                <div class="claim-text style-scope patent-text">receiving from said remote data source based on said step of contacting said remotely originated data to serve as a basis for displaying said video presentation;</div>
                <div class="claim-text style-scope patent-text">executing processor instructions to process said remotely originated data and said user specific data at said video apparatus in order to generate said locally generated image;</div>
                <div class="claim-text style-scope patent-text">storing a first television program in order to present at least one of said locally generated image and said image received from said remote video source at a particular time or place, said locally generated image including at least some information content that does not include any information from said remote video source and said remote data source; and</div>
                <div class="claim-text style-scope patent-text">simultaneously displaying said locally generated image and said image received from said remote video source at said video output device, wherein said at least some information content of said locally generated image is displayed.</div>
            </div>
        </div>
    </div>
    */
    const formatPara = bodyText => {
        // needs to handle '; and' properly
        // also needs to handle : within elements to nest them properly
        // finally needs to get claim number, dependency type and claim type from text
        const tag = '<div class="claim-text style-scope patent-text">';
        const endTag = '</div>'
        const markup = bodyText
            .replace(/\n/g, ' ') //first clean out all linebreaks
            .replace(/(.*;)\s*(.*)\:(.*;\s+and)\s*(.*?;)/g, `$1${tag}$2:${tag}$3$4${endTag}`) //mark out sub-lists with tags. Assumes there's and '; and' before the last line in the sublist, and it ends with a ';'
            .replace(/;\s+and/g, `; and${endTag}${tag}`) //mark the '; and' to put the break in the right place
            .replace(/;(?!\s+and)/g, `;${endTag}`) // mark the end tag for remaining paragraphs
            .replace(/(\<\/div\>)(?!\<)/g, `$1\n${tag}`) //insert start tags
            .replace(/\>\s*/g, '>')//cleanup, get rid of whitespace after tags;
        return `${tag}${markup}${endTag}`;
    }

    const dependentMatch = new RegExp(/claim \d/); // use for true/false
    const numberMatch = new RegExp(/(\d{1,3})\./); // number is $1
    const preambleMatch = new RegExp(/(.*(steps? of|comprising)\:)(.*)/); //preamble is $1, link word is $2, rest is $3

    // 1. Figure out if claim is dependent or not
    const isDependent = dependentMatch.test(claimText);
    // 2. Get the claim number
    const claimNumber = numberMatch.exec(claimText.trim())[1];
    // 3. Get the preamble and body
    const [fullMatch, preamble, linkWord, body] = preambleMatch.exec(claimText);
    // 4. Process body & URL Encode claimHtml
    // 5. Default ClaimStatus is 1: Original, option to choose later
    // 6. Note isMethodClaim is unreliable for dependent claims so just guessing they are methods (TODO: Fix Later !)

    return ({
        ClaimNumber: parseInt(claimNumber, 10),
        ClaimHTML: encodeURI(`<div class="claim${isDependent ? '-dependent' : ''} style-scope patent-text"><div id="CLM-${claimNumber.padStart(5, '0')}" num="${claimNumber.padStart(5, '0')}" class="claim style-scope patent-text"><div class="claim-text style-scope patent-text">${preamble.trim()}${formatPara(body)}</div></div></div>`),
        IsMethodClaim: isDependent || linkWord.includes('step') ? true : false,
        IsDocumented: false,
        IsIndependentClaim: isDependent ? false : true,
        ClaimStatus,
        PatentID: 0 
    });
}


module.exports = {
    formatClaim
}