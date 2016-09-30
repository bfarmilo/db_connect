/*jslint
     es6: true
     browser: true
*/
/*global $, window, console*/
var whatField = "";
var savedField = "";
var whatVal = "";
var filterDoc = false;
var filterMethod = false;
var qrystring = "";
var saveSearch = false;
var defaultField = "First 200 Claims";
//global config
var mainFileName = "";
var outputFileName = "";
var checkFile = "";
var defaultURL = "";
var urlParams = {};
// first load global config values
$.getJSON("js/app_config.json", function (data) {
    urlParams = data.urlParams;
    mainFileName = data.mainFileName;
    outputFileName = data.outputFileName;
    checkFile = data.checkFile;
    defaultURL = data.defaultURL
});
// Header is 50px and footer is 50px; therefore, 100px is of screen height is used
// Define content_height and consider the 100px which has already been used
var content_height = $(window).height() - 110;
// Reset iframe height after window resize
$(function () {
    "use strict";
    $(window).resize(function () {
        content_height = $(window).height() - 110;
        document.getElementById('includeFile').style.height = content_height + "px";
    });
});
$(document).bind("keydown", function (event) {
    "use strict";
    // track enter key
    if (event.which === 13) { // keycode for enter key
        // force the 'Enter Key' to implicitly click the Update button
        $('#Update').click();
        return false;
    } else {
        return true;
    }
}); // end of function
function updateRows() {
    "use strict";
    var countResults = $("#includeFile").contents().find("#numResults").data("num");
    if (countResults === "0") {
        $('#rowsReturned').removeClass("btn-info");
        $('#rowsReturned').addClass("btn-danger");
    } else {
        $('#rowsReturned').removeClass("btn-danger");
        $('#rowsReturned').addClass("btn-info");
    }
    $('#rowsReturned').html(countResults + " matching claims found");
}
//Takes a string (serachContent), a matchVal array of operators (.rexp and .str at least), and a isURI flag (true - return URI encoded)
// break this out and use Browserify  or Require.js ?
function parseSearch(searchContent, matchVal, isURI) {
    "use strict";
    var reParsed = searchContent;
    matchVal.forEach(function (values) {
        reParsed = reParsed.replace(new RegExp(values.rexp, "g"), (isURI ? encodeURIComponent(values.str) : values.str));
    });
    return reParsed;
}
//now for the onload functions
$(document).ready(function () {
    // Set iframe height
    document.getElementById('includeFile').style.height = content_height + "px";
    // set up SearchField text & default value
    $('#SearchField').html(defaultField + "<span class=\"caret\">");
    $('#SearchValue').val('');
    // check to see if the table is ready for loading, and load it
    $.get(defaultURL + checkFile, function () {
        $('#includeFile').attr('src', $('#includeFile').attr('src'));
    });
    // TODO: populate Fieldlist with the valid parameters -- do this to keep things in sync with a single config
    // start event listeners
    // FieldList selection on click
    $('#FieldList li a').on('click', function () {
        savedField = $(this).text();
        whatField = savedField.substring(0, 2);
        //replace the above with a lookup
        $('#SearchField').html($(this).text() + "<span class=\"caret\">");
        if ($(this).text() === "Clear") {
            whatField = "";
            $('#SearchField').html(defaultField + "<span class=\"caret\">");
            $('#SearchValue').val('');
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
        // enable the search refinement
        $('#addSearch').removeClass("disabled");
        whatVal = $('#SearchValue').val();
        // , means OR, replace with "%20OR%20"
        whatVal = parseSearch(whatVal, urlParams.pattern, true); //encode as URI
        qrystring = "?srch=" + whatField + "&srvl=" + whatVal + "&doc=" + filterDoc + "&meth=" + filterMethod + "&save=" + saveSearch;
        // start the spinner
        $('#Update').html("<span class=\"glyphicon glyphicon-refresh glyphicon-refresh-animate\"></span> Working...");
        // get a new 'output.html' which starts the query
        console.log('requesting Main file:' + mainFileName + qrystring);
        $.get(defaultURL + mainFileName + qrystring, function () {
            console.log('got file:' + mainFileName + qrystring);
        });
        // send a request for tableReadycheck to know when the new table is ready
        console.log('requesting Check file:' + checkFile);
        $.get(defaultURL + checkFile, function () {
            console.log('got file:' + checkFile);
            $('#includeFile').attr('src', $('#includeFile').attr('src'));
            $('#Update').html("Run Query");
        });
    });
    //animate the spinner
    $('#Update').html("<span class=\"glyphicon glyphicon-refresh glyphicon-refresh-animate\"></span> Working...");
    // get a new 'output.html' which starts the query
    console.log('requesting Main file:' + mainFileName + qrystring);
    $.get(defaultURL + mainFileName + qrystring, function () {
        console.log('got file:' + mainFileName + qrystring);
    });
    // send a request for tableReadycheck to know when the new table is ready
    console.log('requesting Check File: ' + checkFile);
    $.get(defaultURL + checkFile, function () {
        console.log('got file:' + checkFile);
        $('#includeFile').attr('src', $('#includeFile').attr('src'));
        $('#Update').html("Run Query");
    });
});
