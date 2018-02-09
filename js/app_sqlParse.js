module.exports = sqlParse;
// takes (field, searchstring, callback) as arguments and
// returns a callback (error, where string, array of paramaters)
const pat = require('./app_config.json').urlParams; // stores the whereObj and regEx
//
const matchExp = new RegExp(pat.reg, 'g');

function sqlParse(searchField, saved, savedParamCount, searchString, callback) {
  const parsedSearch = {
    where: '',
    param: [],
  };
  // if saved, we need to add one to all of the indeces
  const delta = saved ? savedParamCount : 0;
  try {
    // if searchString is blank return all patents
    // searchString is of the form word1 OR word2 AND word3
    // could also be word1 OR NOT word2 AND NOT word3
    // has at least one AND or OR
    parsedSearch.param = searchString !== '' ? searchString.split(matchExp).map(values => `%${values}%`) : ['%'];
    // now create a RegExp of the form /param1|param2|param3/g
    // TODO ! Fix bug where a search for A, N, D, O, R, T will mess up this regex. Hope they are at the start or end
    const newMatch = new RegExp(`^${parsedSearch.param.join('|').replace(/%/g, '')}$`, 'g');
    console.log(newMatch);
    // split the where into words like OR, AND, OR NOT, AND NOT
    parsedSearch.where = searchString !== '' ? searchString.split(newMatch).map((values, index, array) => {
      if (index === 0) return `${pat.whereObj[searchField]}${(values.search('NOT') !== -1) ? ' NOT' : ''} LIKE @${index + delta}`;
      if (index === (array.length - 1)) return '';
      return `${values.match(/ AND | OR /g)}${pat.whereObj[searchField]}${(values.search('NOT') !== -1) ? ' NOT' : ''} LIKE @${index + delta}`;
    }).join('') : `${pat.whereObj[searchField]} LIKE @${delta}`;
    return callback(null, parsedSearch.where, parsedSearch.param);
  } catch (err) {
    return callback(err);
  }
}
