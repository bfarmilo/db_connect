const { patentDB } = require('../app_config.json'); // stores the whereObj and regEx

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
  return flatten(expandQuery.map(([fieldName, paramList, operatorList]) => {
    // each element is [fieldname, [param list], [operator list]]
    // lookup the prefix and suffix associated with fieldName
    const [parser] = patentDB.fieldMap.filter(val => val.name === fieldName);
    // now parse the param list to create a where array and a param array
    // for now, put in a placeholder ? to hold where the parameter index will go
    // Make sure compound components are surrounded in brackets
    return paramList.map((item, index) => {
      const negate = item.includes('!');
      const parsedItem = negate ? item.replace('!', '') : item;
      // note: don't need an opening bracket if there is only a single parameter
      // if negated, use notSuffix instead of suffix
      // put the operator associated with this index afterwards, and if the last
      // element, put in an 'AND'. If it turns out this is the last item we will
      // remove the extra 'AND' later
      return {
        where: `${index === 0 && paramList.length > 1 ? '(' : ''}${parser.prefix}${parser.table}.${fieldName}${negate ? parser.notSuffix : parser.suffix}@? ${operatorList[index] || ') AND'}`,
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
    // so now we have a 2 element array. item[0] is the where, item[1] is param List
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

const parseOutput = (mode, result, uriMode) => {
  // first check to see if any results returned. If so
  // query comes down as an array of chunks. So need to join the chunks,
  // Parse as JSON, then flatten into a an array of records one per claim 
  // note if uriMode decode the ClaimHtml in the returned records
  // mode==='claims' for claim query, 'markman' for markman

  return result.length > 0 ? flatten(JSON.parse(result.join('')).map(record => {
    const { claims, ...join0 } = record;
    if (mode === 'claims') {
      // claims mode: FROM claims INNER JOIN patents ON patents.PatentID = claims.PatentID
      // order ['claims']
      return claims.map(claim => ({
        ...join0,
        ...claim,
        ClaimHtml: uriMode ? decodeURIComponent(claim.ClaimHtml) : claim.ClaimHtml
      }))
    } else {
      // markman mode: FROM claims
      // order ['claims', 'mt', 'mc', 'documents', 'clients']
      return claims.map(claim => {
        const { mt, ...join1 } = claim;
        return mt.map(term => {
          const { mc, ...join2 } = term;
          return mc.map(construction => {
            const { documents, ...join3 } = construction;
            return documents.map(document => {
              const { clients, ...join4 } = document;
              return clients.map(client => {
                return {
                  ...join0,
                  ...join1,
                  ...join2,
                  ...join3,
                  ...join4,
                  ...client
                };
              });
            });
          });
        });
      });
    }
    // INNER JOIN patents ON patents.PatentID = claims.PatentID 
    // INNER JOIN  mtc ON mtc.ClaimID = claims.ClaimID
    // INNER JOIN  mt ON mt.TermID = mtc.TermID 
    // INNER JOIN  mc ON mc.ConstructID = mtc.ConstructID 
    // INNER JOIN  document ON document.DocumentID = mc.DocumentID 
    // INNER JOIN  client ON client.ClientID = mtc.ClientID
  })) : '';
}

module.exports = {
  parseQuery,
  parseOrder,
  parseOutput,
  flatten
};