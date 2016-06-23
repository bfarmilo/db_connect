"use strict";

var whatField = ""
var whatVal = ""
var filterDoc = false;
var filterMethod = false;
var qrystring = "";

const targetFile = "index.html";
const dataFile = "resultTable.html";
const defaultField = "First 100 Claims";
const checkFile = "tableReadycheck";
const defaultURL = "http://localhost:8080/";

// Header is 50px and footer is 50px; therefore, 100px is of screen height is used
// Define content_height and consider the 100px which has already been used
var content_height = $(window).height()-110;


// Reset iframe height after window resize
$(function(){
  $(window).resize(function(){
    content_height = $(window).height()-110;
    document.getElementById('includeFile').style.height=content_height+"px";
  });
});

$(document).bind("keydown", function(event) {
	  // track enter key
	  var keycode = (event.keyCode ? event.keyCode : (event.which ? event.which : event.charCode));
	  if (keycode == 13) { // keycode for enter key
		 // force the 'Enter Key' to implicitly click the Update button
		 $('#Update').click();
		 return false;
	  } else  {
		 return true;
	  }
}); // end of function

function updateRows() {
	var countResults = $("#includeFile").contents().find("#numResults").data("num");
	if (countResults == "0") {
		$('#rowsReturned').removeClass("btn-info");
		$('#rowsReturned').addClass("btn-danger");
	} else {
		$('#rowsReturned').removeClass("btn-danger");
		$('#rowsReturned').addClass("btn-info");
	}
	$('#rowsReturned').html(countResults+" matching claims found");
}


$(document).ready(function () {
  // Set iframe height
document.getElementById('includeFile').style.height=content_height+"px";
  // set up SearchField text & default value
  $('#SearchField').html(defaultField + "<span class=\"caret\">");
  $('#SearchValue').val('')

  // check to see if the table is ready for loading, and load it
  $.get(defaultURL+checkFile, function () {
    $('#includeFile').attr('src', $('#includeFile').attr('src'));
  });

  // start event listeners


  // FieldList selection on click
  $('#FieldList li a').on('click', function () {
    whatField = $(this).text().substring(0, 2);
    $('#SearchField').html($(this).text() + "<span class=\"caret\">");
    if ($(this).text() == "Clear") {
      whatField = "";
      $('#SearchField').html(defaultField + "<span class=\"caret\">");
      $('#SearchValue').val('');
    };
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


  // Update page is clicked
  $('#Update').on('click', function () {
    whatVal = $('#SearchValue').val();
    // , means OR, replace with "%20OR%20"
    if (whatVal.indexOf(",")>0) {
      whatVal = whatVal.replace(/,/g, "%20OR%20");
    }
    // + means AND, replace with %20AND%20
    if (whatVal.indexOf("+")>0) {
      whatVal=whatVal.replace(/\+/g, "%20AND%20");
    }
    qrystring = "?srch=" + whatField + "&srvl=" + whatVal + "&doc=" + filterDoc + "&meth=" + filterMethod;

    // start the spinner
    $('#Update').html("<span class=\"glyphicon glyphicon-refresh glyphicon-refresh-animate\"></span> Working...");

    // get a new 'output.html' which starts the query
    $.get(defaultURL + targetFile + qrystring, function(){
      console.log('got file:'+targetFile+qrystring);
    })
    // send a request for tableReadycheck to know when the new table is ready
    $.get(defaultURL+checkFile, function () {
      $('#includeFile').attr('src', $('#includeFile').attr('src'));
      $('#Update').html("Run Query");
    });
  });
});

