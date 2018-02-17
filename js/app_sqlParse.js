// takes (field, searchstring, callback) as arguments and
// returns a callback (error, where string, array of paramaters)
const { urlParams, patentDB } = require('./app_config.json'); // stores the whereObj and regEx
const matchExp = new RegExp(urlParams.reg, 'g');

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
    // Note a search for A, N, D, O, R, T will mess up this regex. Hope they are at the start or end !
    const newMatch = new RegExp(`^${parsedSearch.param.join('|').replace(/%/g, '')}$`, 'g');
    console.log(newMatch);
    // split the where into words like OR, AND, OR NOT, AND NOT
    parsedSearch.where = searchString !== '' ? searchString.split(newMatch).map((values, index, array) => {
      if (index === 0) return `${urlParams.whereObj[searchField]}${(values.search('NOT') !== -1) ? ' NOT' : ''} LIKE @${index + delta}`;
      if (index === (array.length - 1)) return '';
      return `${values.match(/ AND | OR /g)}${urlParams.whereObj[searchField]}${(values.search('NOT') !== -1) ? ' NOT' : ''} LIKE @${index + delta}`;
    }).join('') : `${urlParams.whereObj[searchField]} LIKE @${delta}`;
    return callback(null, parsedSearch.where, parsedSearch.param);
  } catch (err) {
    return callback(err);
  }
}


const expandValues = query => {
  //convert a value into two arrays, one with parameters and one with operators
  //edge case - there are no & or | operators, so add an 'and' at the end
  if (!query.value.includes('&') && !query.value.includes('|')) return [query.field, [query.value], ['AND']];
  return [query.field].concat(query.value.replace(/&/g, '\\AND\\').replace(/\|/g, '\\OR\\').split('\\').reduce((parsed, item) => {
    if (item === 'OR' || item === 'AND') {
      parsed[1].push(item);
    } else {
      parsed[0].push(item);
    }
    return parsed;
  }, [[], []]))
}

/** useful helper to flatten an array
 * @param {array} list
 * @returns {array} of a single level
 */
const flatten = list => list.reduce(
  (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);

/** parseQuery 
 * @param {Array{field, value}} query
 * @returns {string, Array} the SQL formatted where string and parameter array. 
*/
const parseQuery = query => {

  /** expands a query item into a three element array
   * @param {*} query in the form of {field: value}
   * @returns {Array<string, Array<string>, Array<string>>} first element is the field
   * second element is an array of values, third element is an array of operators
   */

  // the main function
  const expandQuery = query.reduce((result, item) => {
    const expandedItem = expandValues(item);
    result.push(expandedItem);
    return result;
  }, []);

  return flatten(expandQuery.map(element => {
    // each element is [fieldname, [param list], [operator list]]
    // lookup the prefix and suffix associated with fieldName
    const parser = patentDB.fieldMap.filter(val => val.name === element[0])[0];
    // now parse the param list to create a where array and a param array
    return element[1].map((item, index) => ({
      where: `${parser.prefix}.${element[0]}${parser.suffix}@? ${element[2][index] || 'AND'}`,
      param: `${parser.suffix === ' LIKE ' ? `%${item}%` : item}`,
    }));
  })).reduce((result, current, index) => {
    // now that the array is flat, replace the ? placeholder
    // with the associated parameter index and push the param array
    result[0].push(`${current.where.replace(/\?/g, `${index}`)}`);
    result[1].push(current.param);
    return result;
  }, [[], []]).reduce((returnValue, item, index) => {
    // and finally compose the return value with {where, param}
    if (index === 1) {
      returnValue.param = item
    } else {
      // merge the where string and slice out the last ' AND'
      returnValue.where = item.join(' ').slice(0, -4)
    }
    return returnValue;
  }, {});
}

const parseOrder = orderBy => {
    // each element is [{fieldname, direction}]
    // lookup the prefix and suffix associated with fieldName
    return orderBy.map(element => {
      const parser = element.field !== 'PatentNumber' ? patentDB.fieldMap.filter(val => val.name === element.field)[0] : {prefix:'patents'};
      return `${parser.prefix}.${element.field} ${element.direction}`;
    });
}

module.exports = {
  sqlParse,
  parseQuery,
  parseOrder
};