
/**Simple Hash function generator from the internet
 * @param {string} paragraph -> the text used to create the hash
 * @returns {string} -> hashed text
 */
const simpleHash = paragraph => {
    return [].reduce.call(paragraph, (p, c, i, a) => (p << 5) - p + a.charCodeAt(i), 0)
}

module.exports = {
    simpleHash
}