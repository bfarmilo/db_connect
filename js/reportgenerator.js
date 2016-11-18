/* eslint-env jquery*/
// import * as ipcRenderer from 'electron';
const { ipcRenderer } = require('electron');
// const { ipcRenderer } = require('electron-ipc-mock');

// global variables
let srch = '';
let savedField = '';
let srvl = '';
let doc = false;
let meth = false;
let save = false;
const defaultField = 'First 200 Claims';
let showDetails = false;
let oldApplication = '';
// global config
let urlParams = {};
// first load global config values
$.getJSON('js/app_config.json', (data) => {
  urlParams = data.urlParams;
});
// define sending the call to the main process
function updateApplication(claimID, newValues) {
  if (oldApplication !== newValues) {
    ipcRenderer.send('update_application', claimID, oldApplication, newValues);
  }
}
// Takes a string (searchContent), a matchVal array of operators (.rexp and .str at least)
function parseSearch(searchContent, matchVal) {
  let reParsed = searchContent;
  matchVal.forEach((values) => {
    reParsed = reParsed.replace(new RegExp(values.rexp, 'g'), values.str);
  });
  // console.log(reParsed);
  return reParsed;
}

// now for the onload functions
$(document).ready(() => {
  // default to main view
  $('.markmanView').hide();
  // set up SearchField text & default value
  $('#SearchField').html(`${defaultField}<span class='caret'>`);
  $('#SearchValue').val('');
  // TODO: populate Fieldlist with the valid parameters --
  // do this to keep things in sync with a single config
  // start event listeners
  ipcRenderer.on('tableReady', (event, contents, countResults) => {
    // update the results Count
    if (countResults === '0') {
      $('#rowsReturned').removeClass('btn-info');
      $('#rowsReturned').addClass('btn-danger');
    } else {
      $('#rowsReturned').removeClass('btn-danger');
      $('#rowsReturned').addClass('btn-info');
    }
    $('#rowsReturned').html(`${countResults} matching claims found`);
    // insert the table into #includeFile
    $('#includeFile').html(contents);
    // add listeners to each patentLink element
    $('.patentLink').on('click', (patentEvent) => {
      console.log(patentEvent);
      ipcRenderer.send('open_patent', patentEvent.target.attributes.getNamedItem('data-url').value);
    });
    // add listeners to Potential Application
    $('.application').on('click', (applicationEvent) => {
      oldApplication = applicationEvent.target.innerHTML;
      // console.log($(this).data('claimid'), $(this).html());
    });
    // return the spinner to normal
    $('#Update').html('Run Query');
    // enable the showDetails box
    $('#showDetails').removeClass('disabled');
    $('#showDetails').addClass('btn-default');
  });
  // FieldList selection on click
  $('#FieldList li a').on('click', (event) => {
    savedField = event.target.innerHTML;
    srch = savedField.substring(0, 2);
    // TODO: replace the above with a lookup
    $('#SearchField').html(`${savedField}<span class='caret'>`);
    $('#SearchValue').prop('disabled', false);
    if (savedField === 'Clear') {
      srch = '';
      $('#SearchField').html(`${defaultField}<span class='caret'>`);
      $('#SearchValue').val('');
      $('#SearchValue').prop('disabled', true);
    }
    // if a markman-type search is done, show the markman table view
    if (srch === 'Te' || srch === 'Co') {
      $('.markmanView').show();
      $('.mainView').hide();
    } else {
      $('.markmanView').hide();
      $('.mainView').show();
    }
  });
  // Documented is clicked
  $('#Documented').on('click', () => {
    doc = !(doc);
    if (doc) {
      $('#Documented').addClass('btn-primary');
    } else {
      $('#Documented').removeClass('btn-primary');
    }
  });
  // no Method Claims is clicked
  $('#Method').on('click', () => {
    meth = !(meth);
    if (meth) {
      $('#Method').addClass('btn-primary');
    } else {
      $('#Method').removeClass('btn-primary');
    }
  });
  // show details is clicked
  $('#showDetails').on('click', () => {
    if (showDetails) {
      $('details').removeAttr('open');
      $('#showDetails').html('Show All Clm Text');
    } else {
      $('details').attr('open', true);
      $('#showDetails').html('Hide All Clm Text');
    }
    showDetails = !showDetails;
  });
  // Plus is clicked
  $('#addSearch').on('click', () => {
    save = !(save);
    if (save) {
      $('#addSearch').html('<span class=\'glyphicon glyphicon-minus\'></span>');
      $('#addSearch').removeAttr('title');
      $('#addSearch').attr('title', `${savedField}= ${srvl}`);
      $('#addSearch').addClass('btn-primary');
      srch = '';
      $('#SearchField').html(`${defaultField}<span class='caret'>`);
      $('#SearchValue').val('');
    } else {
      $('#addSearch').html('<span class=\'glyphicon glyphicon-plus\'></span>');
      $('#addSearch').removeAttr('title');
      $('#addSearch').attr('title', 'Click to Refine Results');
      $('#addSearch').removeClass('btn-primary');
    }
  });
  // Update page is clicked
  $('#Update').on('click', () => {
    // start the spinner
    $('#Update').html('<span class=\'glyphicon glyphicon-refresh glyphicon-refresh-animate\'></span> Working...');
    // enable the search refinement
    $('#addSearch').removeClass('disabled');
    srvl = $('#SearchValue').val();
    // now encode srvl, replace ','with OR , '+' with AND , '! with NOT
    srvl = parseSearch(srvl, urlParams.pattern);
    const qrystring = { srch, srvl, doc, meth, save };
    // send the string to the main process
    console.log(JSON.stringify(qrystring));
    ipcRenderer.send('new_query', qrystring);
  });
  // Enter or ESC is pressed
  $(document).on('keydown', (event) => {
    // track enter key
    const isApplication = (event.target.className.search('application') !== -1);
    if (event.which === 13) { // keycode for enter key
      // force the 'Enter Key' to implicitly click the Update button
      if (isApplication) {
        updateApplication(event.target.attributes.getNamedItem('data-claimid').value, event.target.innerHTML);
      } else {
        $('#Update').click();
      }
      return false;
    } else if (event.which === 27) {
      if (isApplication) {
        event.target.innerHTML = oldApplication;
      }
      return false;
    }
    return true;
  });
});
