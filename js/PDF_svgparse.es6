// takes a pdf page in svg form and does a few things.
// 1. GET_Y outputs an array of y-offsets for all text elements, with no repeats
// 2. NO_IMAGE provides an interface to filter out certain svg elements. NO_IMAGE removes images


function svgparse(svg, option) {

    function stripImages(nameSpace, svgFile) {
        for (let elem of svgFile.getElementsByTagNameNS(nameSpace, "image")) {
            console.log(elem);
            elem.parentNode.removeChild(elem);
            //not working every time -- weird
        }
    }

    if (option === "NO_IMAGE") {
        // filter out any svg tags with images
        stripImages('http://www.w3.org/2000/svg', svg);
        //stripImages ('http://www.w3.org/1999/xlink', svg);
        return svg;
    }

    if (option === "GET_TEXT_Y") {
        let returnval = [];
        // set up returnval as {y: 13.23 linetext: "a bunch of text from that line more or less"}
        let linetext = [];
        let y = -1;
        let textTag = 'tspan';
        for (let elem of svg.getElementsByTagName(textTag)) {
            //look through each tspan tag:
            if (elem.getNumberOfChars() > 0) { //make sure the tspan has at least 1 character
                //Get
                //1. the character position (via getStartPositionOfChar) in the 'user' coordinate system
                //2. the transform matrix (via getCTM) from user(element) to page coordinate systems
                //then multiply (via matrixTransform) to get the actual y position on the page
                let position = elem.getStartPositionOfChar(0).matrixTransform(elem.getCTM());
                //console.log (`oldy: ${y} current y: ${Math.floor(position.y)} text: ${elem.textContent} textarray: ${linetext}`);
                if (Math.floor(position.y) !== y && y !== -1) {
                    //a new element, so concatenate the string
                    //put the 'currentline' array into returnval
                    returnval.push([].concat(y, linetext.map((item) => item).join('')));
                    linetext = [];
                };
                y = Math.floor(position.y);
                linetext.push(elem.textContent);
            }
        }
        console.log(returnval);
        return returnval;
    }
}

function clickedLine(element) {
    return `y=${Math.floor(element.getStartPositionOfChar(0).matrixTransform(element.getCTM()).y)}`;
}

module.exports = {
    svgparse,
    clickedLine
};
