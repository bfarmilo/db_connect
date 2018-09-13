// Configure JSDOM and set global variables
// to simulate a browser environment for tests.
const { jsdom } = require('jsdom');

var exposedProperties = ['window', 'navigator', 'document']

global.document = jsdom('')
global.navigator = { userAgent: 'node.js' }
global.window = document.defaultView

Object.keys(document.defaultView).forEach((property) => {
    if (typeof global[property] === 'undefined') {
        exposedProperties.push(property)
        global[property] = document.defaultView[property]
    }
})

documentRef = document;
