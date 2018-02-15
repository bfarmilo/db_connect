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
let potentialApplication = { claimID: 0, text: '' }
let state = {
  lastOriginal: potentialApplication,
  current: potentialApplication,
  lastUpdated: potentialApplication,
  lastWatch: potentialApplication,
  currentWatch: potentialApplication,
  updatedWatch: potentialApplication
}
// global config
let urlParams = {};
// first load global config values
$.getJSON('js/app_config.json', (data) => {
  urlParams = data.urlParams;
});
// define sending the call to the main process
function updateApplication(record) {
  showSpinner(true, 'Saving App');
  ipcRenderer.send('update_application', record.lastOriginal.claimID, record.lastOriginal.text, record.lastUpdated.text);
}
function updateWatch(record) {
  console.log('sending update_watch event with ', record);
  showSpinner(true, 'Saving Watch');
  ipcRenderer.send('update_watch', record.lastWatch.claimID, record.lastWatch.text, record.updatedWatch.text);
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

function showSpinner(activate, message) {
  if (activate) {
    $('#Update').html(`<span class=\'glyphicon glyphicon-refresh glyphicon-refresh-animate\'></span> ${message}`);
  } else {
    $('#Update').html(message);
  }
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
  ipcRenderer.on('ready', (event) => {
    showSpinner(false, 'Run Query');
  })
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
      ipcRenderer.send('view_patentdetail', patentEvent.target.innerText);
    });
    // add listeners to Potential Application
    $('.application').on('click', (applicationEvent) => {
      state.current = {
        claimID: applicationEvent.target.attributes.getNamedItem('data-claimid').value,
        text: applicationEvent.target.innerHTML
      };
      console.log('Application field clicked. current state', Object.assign(state));
      if (state.lastUpdated.claimID !== state.current.claimID && state.lastUpdated.claimID !== 0 && state.lastOriginal.claimID !== 0) {
        // clicking a new claim, and clicked one before, better update the old one first
        if (state.lastUpdated.text !== state.lastOriginal.text) updateApplication(state);
      }
      // now update these state variables
      state.lastOriginal = state.current;
      state.lastUpdated = state.current;
      // console.log($(this).data('claimid'), $(this).html()); F
    });
    $('.application').on('keyup', (applicationEvent) => {
      const selection = window.getSelection();
      const enterPos = selection.anchorOffset;
      let text = applicationEvent.target.innerHTML;
      if (applicationEvent.which === 13) {
        console.log('splitting at position %d', enterPos)
        text = `${text.slice(0, enterPos)}<br>${text.slice(enterPos)}`;
        applicationEvent.target.innerHTML = text;
      }
      // as typing goes, update lastUpdated
      state.lastUpdated = {
        claimID: applicationEvent.target.attributes.getNamedItem('data-claimid').value,
        text
      }
    })
    // add listeners to Potential Application
    $('.watch').on('click', (watchEvent) => {
      state.currentWatch = {
        claimID: watchEvent.target.attributes.getNamedItem('data-claimid').value,
        text: watchEvent.target.innerHTML
      };
      console.log('Watch field clicked. current state', Object.assign(state));
      if (state.updatedWatch.claimID !== state.currentWatch.claimID && state.updatedWatch.claimID !== 0 && state.lastWatch.claimID !== 0) {
        // clicking a new claim, and clicked one before, better update the old one first
        if (state.updatedWatch.text !== state.lastWatch.text) updateWatch(state);
      }
      // now update these state variables
      state.lastWatch = state.currentWatch;
      state.updatedWatch = state.currentWatch;
      // console.log($(this).data('claimid'), $(this).html()); F
    });
    $('.watch').on('keyup', watchEvent => {
      state.updatedWatch = {
        claimID: watchEvent.target.attributes.getNamedItem('data-claimid').value,
        text: watchEvent.target.innerHTML
      }
    })
    // return the spinner to normal
    showSpinner(false, 'Run Query');
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
    if (srch === 'Te' || srch === 'Co' || srch === 'Nu') {
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
    showSpinner(true, 'Working ...');
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
      // force the 'Enter Key' to implicitly click the Update button, unless editing an application
      if (!isApplication) {
        $('#Update').click();
      }
      return false;
    } else if (event.which === 27) {
      // escape key cancels the update of the 'Application' text
      if (isApplication) {
        //TODO something about this
      }
      return false;
    }
    return true;
  });
});
