module.exports = generateOutput;
// takes arguments (QueryResultsarray, callback), returns callback(error, formattedHTMLstring)
// note - a?b:c is the ternary operator, means 'if a, then b else c'
// template for claim view
const table = resultArray => `<table class='table-striped table-bordered'>
<!--0:PMC Ref-1:PatentURL-2:Patent Number-3:Claim Number-4:Claim HTML-5:Application-6:Watch Items-7:ClaimID-->
<tbody>
<tr class='toprow'></tr>
${resultArray.map(patent => `    <tr>
      <td class='col-sm-1 col-md-1 col-lg-1'>${patent[0]}</td>
      <td class='col-sm-1 col-md-1 col-lg-1'>
        <div class='patentLink btn btn-small' data-url='${patent[1] ? patent[1] : '#'}' target='_blank'>
          ${patent[2]}
        </div>
      </td>
      <td class='col-sm-8 col-md-8 col-lg-8'>
        <details>
          <summary${(patent[4].search('dependent') === -1) ? '' : ' class=\'claim-dependent\''}>
            Claim ${patent[3]}
          </summary>${patent[4]}
        </details>
      </td>
      <td class='application col-sm-1 col-md-1 col-lg-1' data-claimid='${patent[7]}' contenteditable='true'>${patent[5] ? patent[5] : ' '}</td>
      <td class='col-sm-1 col-md-1 col-lg-1'>${patent[6] ? patent[6] : ' '}</td>
     </tr>
  `).join('')}
 </tbody>
</table>
`;
// note line 12: if patent[1] (link to file) doesn't exist then
//  just put in a page-reload # hyperlink
// note line 18: if patent[4] (claim text) contains 'dependent' then
// addClass 'claim-dependent' to the summary
// note line 23: if patent[5] (application) is null then show a space instead
// note line 24: if patent[6] (watch items) is null then show a space instead

// template for markman view
const markmantable = resultArray =>
`<table class='table-striped table-bordered'>
<!--0:PMC Ref-1:PatentURL-2:Patent Number-3:Claim Number-4:Claim Term-5:Construction-6:Page-7:Path to Ruling-8:Filename of ruling-9:application-->
<tbody>
<tr class='toprow'></tr>
${resultArray.map(patent => `    <tr>
      <td class='col-sm-1 col-md-1 col-lg-1'>${patent[0]}</td>
      <td class='col-sm-1 col-md-1 col-lg-1'>
      <div class='patentLink btn btn-small' data-url='${patent[1] ? patent[1] : '#'}' target='_blank'>
        ${patent[2]}
      </div>
      </td>
      <td class='col-sm-1 col-md-1 col-lg-1'>${patent[3]}</td>
      <td class='col-sm-3 col-md-3 col-lg-3'>${patent[4]}</td>
      <td class='col-sm-4 col-md-4 col-lg-4'>${patent[5]}</td>
      <td class='col-sm-1 col-md-1 col-lg-1'>
        <div class='patentLink btn btn-small' data-url='${patent[7].replace(/\\/g, '/')}${patent[8]}' target='_blank'>
          <span class='glyphicon glyphicon-new-window'></span> pg.${patent[6]}
        </div>
      </td>
      <td class='col-sm-1 col-md-1 col-lg-1'>${patent[9] ? patent[9] : ' '}</td>
     </tr>
  `).join('')}
 </tbody>
</table>
`;

// called when we have a good DB connection
function generateOutput(type, results, callback) {
  try {
    if (type[0] === 'p') {
      // querytype starting with 'p' is the patents table
      return callback(null, table(results), results.length.toString());
    }
    // otherwise, querytype starts with 'm'
    return callback(null, markmantable(results), results.length.toString());
  } catch (err) {
    return callback(err);
  }
} // generateResults
