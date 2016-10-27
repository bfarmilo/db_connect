/*jslint
     es6: true
     browser: true
*/
const { ipcRenderer } = require('electron');
/*global $, window, console*/
var whatField = "";
var savedField = "";
var whatVal = "";
var filterDoc = false;
var filterMethod = false;
var qrystring = {};
var saveSearch = false;
var defaultField = "First 200 Claims";
var showDetails = false;
var oldApplication = "";
//global config
var urlParams = {};
// first load global config values
$.getJSON("js/app_config.json", function (data) {
    urlParams = data.urlParams;
});
//add listener to enter key press
$(document).on("keydown", function (event) {
    "use strict";
    // track enter key
    var isApplication = (event.target.className.search("application")!=-1?true:false);
    if (event.which === 13) { // keycode for enter key
        // force the 'Enter Key' to implicitly click the Update button
        if (isApplication) {
          updateApplication(event.target.attributes.getNamedItem("data-claimid").value, event.target.innerHTML);
        } else {
          $('#Update').click();
        }
        return false;
    } else if (event.which === 27) {
      if (isApplication) {
        event.target.innerHTML = oldApplication;
      }
      return false;
    } else {
        return true;
    }
});

//Takes a string (searchContent), a matchVal array of operators (.rexp and .str at least), and a isURI flag (true - return URI encoded)
function parseSearch(searchContent, matchVal, isURI) {
    "use strict";
    var reParsed = searchContent;
    matchVal.forEach(function (values) {
        reParsed = reParsed.replace(new RegExp(values.rexp, "g"), (isURI ? encodeURIComponent(values.str) : values.str));
    });
    return reParsed;
}

function updateApplication (claimID, newValues) {
  if (oldApplication != newValues) {
    ipcRenderer.send('update_application', claimID, oldApplication, newValues);
  }
}

//now for the onload functions
$(document).ready(function () {
    // default to main view
    $('.markmanView').hide();
    // set up SearchField text & default value
    $('#SearchField').html(defaultField + "<span class=\"caret\">");
    $('#SearchValue').val('');
    // TODO: populate Fieldlist with the valid parameters -- do this to keep things in sync with a single config
    // start event listeners

    ipcRenderer.on('tableReady', function(event, contents, countResults) {
      // update the results Count
        if (countResults === "0") {
            $('#rowsReturned').removeClass("btn-info");
            $('#rowsReturned').addClass("btn-danger");
        } else {
            $('#rowsReturned').removeClass("btn-danger");
            $('#rowsReturned').addClass("btn-info");
        }
        $('#rowsReturned').html(countResults + " matching claims found");
        // insert the table into #includeFile
        $('#includeFile').html(contents);
        //add listeners to each patentLink element
        $('.patentLink').on('click', function () {
            console.log($(this).data('url'));
            ipcRenderer.send('open_patent', $(this).data('url'));
        });
        // add listeners to Potential Application
        $(".application").on("click", function () {
          oldApplication = $(this).html();
          console.log($(this).data("claimid"), $(this).html());
        });
        // return the spinner to normal
        $('#Update').html("Run Query");
        // enable the showDetails box
        $('#showDetails').removeClass('disabled');
        $('#showDetails').addClass('btn-default');
    });
    // FieldList selection on click
    $('#FieldList li a').on('click', function () {
        savedField = $(this).text();
        whatField = savedField.substring(0, 2);
        //TODO: replace the above with a lookup
        $('#SearchField').html($(this).text() + "<span class=\"caret\">");
        $('#SearchValue').prop('disabled', false);
        if ($(this).text() === "Clear") {
            whatField = "";
            $('#SearchField').html(defaultField + "<span class=\"caret\">");
            $('#SearchValue').val('');
            $('#SearchValue').prop('disabled', true);
        }
        // if a markman-type search is done, show the markman table view
        if (whatField === "Te" || whatField === "Co") {
          $('.markmanView').show();
          $('.mainView').hide();
        } else {
          $('.markmanView').hide();
          $('.mainView').show();
        }


    });
    // Documented is clicked
    $('#Documented').on('click', function () {
        filterDoc = !(filterDoc);
        if (filterDoc) {
            $('#Documented').addClass("btn-primary");
        } else {
            $('#Documented').removeClass("btn-primary");
        }
    });
    // no Method Claims is clicked
    $('#Method').on('click', function () {
        filterMethod = !(filterMethod);
        if (filterMethod) {
            $('#Method').addClass("btn-primary");
        } else {
            $('#Method').removeClass('btn-primary');
        }
    });
    // show details is clicked
    $('#showDetails').on('click', function () {
      if (showDetails) {
        $('details').removeAttr('open');
        $('#showDetails').html('Show All Clm Text');
      } else {
        $('details').attr('open', true);
        $('#showDetails').html('Hide All Clm Text');
      }
      showDetails = !showDetails;
    });
    //Plus is clicked
    $('#addSearch').on('click', function () {
        saveSearch = !(saveSearch);
        if (saveSearch) {
            $('#addSearch').html("<span class=\"glyphicon glyphicon-minus\"></span>");
            $('#addSearch').removeAttr("title");
            $('#addSearch').attr("title", savedField + "= " + whatVal);
            $('#addSearch').addClass('btn-primary');
            whatField = "";
            $('#SearchField').html(defaultField + "<span class=\"caret\">");
            $('#SearchValue').val('');
        } else {
            $('#addSearch').html("<span class=\"glyphicon glyphicon-plus\"></span>");
            $('#addSearch').removeAttr("title");
            $('#addSearch').attr("title", "Click to Refine Results");
            $('#addSearch').removeClass('btn-primary');
        }
    });
    // Update page is clicked
    $('#Update').on('click', function () {
      // start the spinner
      $('#Update').html("<span class=\"glyphicon glyphicon-refresh glyphicon-refresh-animate\"></span> Working...");
        // enable the search refinement
        $('#addSearch').removeClass("disabled");
        whatVal = $('#SearchValue').val();
        // , means OR, replace with "%20OR%20"
        whatVal = parseSearch(whatVal, urlParams.pattern, false); //encode as URI
        //qrystring = "?srch=" + whatField + "&srvl=" + whatVal + "&doc=" + filterDoc + "&meth=" + filterMethod + "&save=" + saveSearch;
        qrystring = {
            srch: whatField,
            srvl: whatVal,
            doc: filterDoc,
            meth: filterMethod,
            save: saveSearch
        };
        // send the string to the main process
        console.log('new query sent to main process: ', qrystring);
        ipcRenderer.send('new_query', qrystring, savedField);
    });
});
