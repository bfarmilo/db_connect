<<<<<<< HEAD
"use strict";

=======
>>>>>>> b70a3d1c29aa9aa6c6e9397b0b7f5856996eeb39
var whatField = ""
var whatVal = ""
var filterDoc = false;
var filterMethod = false;
var qrystring = "";

<<<<<<< HEAD
const targetFile = "index.html";
const dataFile = "resultTable.html";
const defaultField = "First 100 Claims";
const checkFile = "tableReadycheck";
const defaultURL = "http://localhost:8080/";

// Header is 50px and footer is 50px; therefore, 100px is of screen height is used
// Define content_height and consider the 100px which has already been used
var content_height = $(window).height()-110;
=======
const targetFile = "output.html";
const dataFile = "resultTable.html";
const defaultField = "First 100 Claims";

// Header is 50px and footer is 50px; therefore, 100px is of screen height is used
// Define content_height and consider the 100px which has already been used
var content_height=document.body.scrollHeight-100;
content_height = $(window).height() -110;
//alert(content_height);
>>>>>>> b70a3d1c29aa9aa6c6e9397b0b7f5856996eeb39


// Reset iframe height after window resize
$(function(){
<<<<<<< HEAD
  $(window).resize(function(){
    content_height = $(window).height()-110;
    document.getElementById('includeFile').style.height=content_height+"px";
  });
=======
	$(window).resize(function(){
		content_height = $(window).height()-110;
		//var content_height=document.body.scrollHeight-100;
		//alert(content_height);
		document.getElementById('includeFile').style.height=content_height+"px";
	});
>>>>>>> b70a3d1c29aa9aa6c6e9397b0b7f5856996eeb39
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
<<<<<<< HEAD
}); // end of function
=======
}); // end of function	
>>>>>>> b70a3d1c29aa9aa6c6e9397b0b7f5856996eeb39

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

<<<<<<< HEAD

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

=======
$(document).ready(function () {
	// Set iframe height
    document.getElementById('includeFile').style.height=content_height+"px";
	$('#SearchField').html(defaultField + "<span class=\"caret\">");
	$('#Refresh').addClass('btn-warning');
	$('#Refresh').hide();
	$('#SearchValue').val('')

	
	// Generate Query Parameters
	$('#FieldList li a').on('click', function () {
		whatField = $(this).text().substring(0, 2);
		$('#SearchField').html($(this).text() + "<span class=\"caret\">");
		if ($(this).text() == "Clear") {
			whatField = "";
			$('#SearchField').html(defaultField + "<span class=\"caret\">");
			$('#SearchValue').val('');
		};
		//console.log(whatField, whatVal, filterDoc, filterMethod);
	});

	//$('#SearchValue').on('change', function () {
	//	whatVal = $('#SearchValue').val();
		//console.log(whatField, whatVal, filterDoc, filterMethod);});

	$('#Documented').on('click', function () {
		filterDoc = !(filterDoc);
		if (filterDoc) {
			$('#Documented').addClass("btn-primary");
		} else {
			$('#Documented').removeClass("btn-primary");
		}
		//console.log(whatField, whatVal, filterDoc, filterMethod);
	});
	$('#Method').on('click', function () {
		filterMethod = !(filterMethod);
		if (filterMethod) {
			$('#Method').addClass("btn-primary");
		} else {
			$('#Method').removeClass('btn-primary');
		}
		//console.log(whatField, whatVal, filterDoc, filterMethod);
	});


	$('#Update').on('click', function () {
		//first need to clean up whatVal, get rid of spaces and punctuation
		whatVal = $('#SearchValue').val().replace(/ /g, "");
		// , means OR, replace with "%20OR%20", + means AND, replace with %20AND%20
		console.log(whatVal);
		if (whatVal.indexOf(",")>0) {
			whatVal = whatVal.replace(/,/g, "%20OR%20");
		}
		if (whatVal.indexOf("+")>0) {
			whatVal=whatVal.replace(/\+/g, "%20AND%20");
		}
		qrystring = "?srch=" + whatField + "&srvl=" + whatVal + "&doc=" + filterDoc + "&meth=" + filterMethod;
		console.log(qrystring);
		$('#Update').html("<span class=\"glyphicon glyphicon-refresh glyphicon-refresh-animate\"></span> Working...");
		$.get("http://localhost:8080/" + targetFile + qrystring, function (data) {
			console.log("dispatched new query");
			// a nasty hack -- stall for 1.8 seconds while the query runs ...
			$('#includeFile').slideUp(1800, function(){
				//$('#includeFile').load(dataFile);
				$('#includeFile').attr('src', $('#includeFile').attr('src'));
				$('#Update').html("Run Query");
			});
			$('#includeFile').slideDown(200);
		});
	});
});
>>>>>>> b70a3d1c29aa9aa6c6e9397b0b7f5856996eeb39
