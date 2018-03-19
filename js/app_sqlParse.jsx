// takes (field, searchstring, callback) as arguments and
// returns a callback (error, where string, array of paramaters)
const { urlParams, patentDB } = require('../js/app_config.json'); // stores the whereObj and regEx
const matchExp = new RegExp(urlParams.reg, 'g');

/** expands a query item into a three element array
 * @param {Object} query in the form of {field: value}
 * @returns {Array<string, Array<string>, Array<string>>} first element is the field
 * second element is an array of values, third element is an array of operators
 */
const expandValues = query => {

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

  // create an expanded query, to deal with | and & in any query values
  const expandQuery = query.reduce((result, item) => {
    const expandedItem = expandValues(item);
    result.push(expandedItem);
    return result;
  }, []);
  // now flatten it down and map it to a valid SQL where and parameter list
  return flatten(expandQuery.map(element => {
    // each element is [fieldname, [param list], [operator list]]
    // lookup the prefix and suffix associated with fieldName
    const parser = patentDB.fieldMap.filter(val => val.name === element[0])[0];
    // now parse the param list to create a where array and a param array
    // for now, put in a placeholder ? to hold where the parameter index will go
    // Make sure compound components are surrounded in brackets
    return element[1].map((item, index) => {
      const negate = item.includes('!');
      const parsedItem = negate ? item.replace('!', '') : item;
      // note: don't need an opening bracket if there is only a single parameter
      // if negated, use notSuffix instead of suffix
      // put the operator associated with this index afterwards, and if the last
      // element, put in an 'AND'. If it turns out this is the last item we will
      // remove the extra 'AND' later
      return {
        where: `${index === 0 && element[1].length > 1 ? '(' : ''}${parser.prefix}${parser.table}.${element[0]}${negate ? parser.notSuffix : parser.suffix}@? ${element[2][index] || ') AND'}`,
        param: `${parser.suffix === ' LIKE ' ? `%${parsedItem}%` : parsedItem}`,
      }
    });
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

/** a simple function that creates a valid ORDER BY sql query
 * @param {Array<{fieldname:string, ascending:boolean}>}
 * @returns {string} of the form 'table.Field ASC'
 */
const parseOrder = (orderBy, offset, fetch) => {
  // each element is [{fieldname, ascending}]
  // lookup the table associated with fieldName
  return 'ORDER BY '.concat(orderBy.map(element => {
    const table = patentDB.fieldMap.filter(val => val.name === element.field)[0].table;
    const direction = element.ascending ? 'ASC' : 'DESC';
    return `${table}.${element.field} ${direction}`;
  }).join(', ')).concat(` OFFSET ${offset} ROWS FETCH NEXT ${fetch} ROWS ONLY`);
}

const parseOutput = (result, uriMode) => {
  // first check to see if any results returned. If so,
  // query comes down as an array of chunks. So need to join the chunks,
  // Parse as JSON, then flatten into a an array of records one per claim 
  // note if uriMode decode the ClaimHtml in the returned records
  return result.length > 0 ? flatten(JSON.parse(result.join('')).map(patent => {
    let item = Object.assign({}, patent)
    delete item.claims;
    return patent.claims.map(claim => ({
      ...item,
      ...claim,
      ClaimHtml: uriMode ? decodeURIComponent(claim.ClaimHtml) : claim.ClaimHtml
    }))
  })) : '';
}

module.exports = {
  parseQuery,
  parseOrder,
  parseOutput,
  flatten
};