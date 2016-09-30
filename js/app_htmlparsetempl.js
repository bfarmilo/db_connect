module.exports = generateOutput;
// takes arguments (QueryResultsarray, callback), returns callback(error, formattedHTMLstring)


//note - a?b:c is the ternary operator, means "if a, then b else c"
const table = resultArray =>
`<table class="table-striped table-bordered">
<tbody>
${resultArray.map( patent => `    <tr>
      <td class="col-sm-1 col-md-1 col-lg-1">${patent[0]}</td>
      <td class="col-sm-1 col-md-1 col-lg-1">
        <div class="patentLink btn btn-small" data-url="${patent[1]?patent[1]:"#"}" target="_blank">
          ${patent[2]}
        </div>
      </td>
      <td class="col-sm-8 col-md-8 col-lg-8">
        <details>
          <summary${(patent[4].search('dependent')===-1)?'':' class=\"claim-dependent\"'}>
            Claim ${patent[3]}
          </summary>${patent[4]}
        </details>
      </td>
      <td class="application col-sm-1 col-md-1 col-lg-1" data-claimid="${patent[7]}" contenteditable="true">${patent[5]?patent[5]:" "}</td>
      <td class="col-sm-1 col-md-1 col-lg-1">${patent[6]?patent[6]:" "}</td>
     </tr>
  `).join('')}
 </tbody>
</table>
`

// now if patent[4] contains 'dependent' then addClass 'claim-dependent' to the summary


// called when we have a good DB connection
function generateOutput(results, callback) {
    try {
        return callback(null, table(results), results.length.toString());
    } catch (err) {
        return callback(err);
    }
}; // generateResults
