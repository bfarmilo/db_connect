module.exports = generateOutput;
// takes arguments (QueryResultsarray, callback), returns callback(error, formattedHTMLstring)

//html output variables
const headerString = "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/><meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />	<!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags --><title>Query Results</title><link rel=\"stylesheet\" href=\"css/querystyle.css\" /><!-- Bootstrap --><link href=\"css/bootstrap.min.css\" rel=\"stylesheet\" />	<!-- jQuery (necessary for Bootstrap's JavaScript plugins) --><script src=\"js/jquery-2.2.3.js\"></script>	<!-- Include all compiled plugins (below), or include individual files as needed --><script src=\"js/bootstrap.min.js\"></script></head><body><table class=\"table-striped table-fixed table-bordered\"><tbody>"; // the same header for the file each time

const endString = "</tbody></table></body></html>"; //closes out the header

var outputString = ""; // keeps track of the body of the table

// called when we have a good DB connection
function generateOutput(results, callback) {
  try {
    // track the number of rows returned in a hidden div
    outputString = "<div id=\"numResults\" data-num=\""+results.length.toString()+"\"> </div>"
    // iterate through the rows that the query returns
    for (var i = 0; i < results.length; i++) {
      //start with a new row tag
      outputString += "<tr>";
      var colClass = "col-md-1 col-lg-1"; //set an initial value for the column class
      //go though each column returned in the current row
      results[i].forEach(function addColtags(val, idx) {
        if (idx == 4) {
          colClass = "col-md-7 col-lg-7"; //claim needs a wider box
        } else {
          colClass = "col-md-1 col-lg-1";
        }
        if (idx !== 2)
          outputString += "<td class=\"col" + (idx + 1) + " " + colClass + "\">"; //put in the opening <td> tag, except for the patent column
        // idx 1 is the patent path
        if (idx == 1) {
          if (val) {
            // not all patents have a URL in the database
            val = val.replace(/\\/g, "/"); //convert back slash to slash
            outputString += "<a href=\""+val+"\" target =\"_blank\">" //for the patent path, bury it an <a> tag
          } else {
            outputString += "<a href=#>";
          }
        } else {
          outputString += val; // insert the value into the cell
          if (idx == 2)
            outputString += "</a>"; //for the patent number close the <a> tag
          outputString += "</td>"; //in any case close the <td> tag
        } // if-then-else
      }); // forEach, ie end of the row
      outputString += "</tr>";
    }; // for loop, ie, time for a new row
    return callback(null, headerString+outputString+endString);
  }
  catch(err) {
    return callback(err);
  }
}; // generateResults
