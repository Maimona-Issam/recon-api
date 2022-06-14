var today = new Date();
var month = today.getMonth() + 1;
var day = today.getDate();
if (today.getMonth() < 10) {
  month = '0' + month;
}
if (today.getDate() < 10) {
  day = '0' + day;
}

var today = `${today.getFullYear()}-${month}-${day}`;
const elem = document.getElementById('rangeDate');
const datepicker = new DateRangePicker(elem, {
  // ...options
  minDate: "2019-02-07",
  maxDate: today,
  format: "yyyy-mm-dd"
});


var mode = 'payments';
var urls = {
  'payments': 'https://api.checkout.com/reporting/payments/download',
  'statement': 'https://api.checkout.com/reporting/statements/{StatementId}/payments/download',
  'statements': 'https://api.checkout.com/reporting/statements/download',
}
var key = '';
var statements = [];
var statements_ids = [];
var statement_currencies = {};
var statement_payouts = {};
var selected_statement = '';
var selected_payout = '';
var selected_currency = '';
changeMode();

var reports = [];
var res = null;

function unblockPage() {
    console.log('hi2');
    $('.loader').hide();
    $("#getRes").prop("disabled", false);
  }
  function blockPage() {
    console.log('hi');
    $('.loader').show();
    $("#getRes").prop("disabled", true);
  }
  function resetOptions() {
    $('#breakdown').prop('checked',false);
    $('#from').val('');
    $('#to').val('');
    $('#limit').val('');
    $('#reference').val('');
    $('#statementId').val('');
    $('#payoutId').val('');
    $('#currency').val('');
    selected_currency = '';
    selected_payout = '';
    selected_statement = '';
  }
  function showMessage(type, msg) {
    $(".alert-dismissible .close").click(); 
    $('#alert-area').append('<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' + msg + '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>');
  }

  
function changeMode() {
  resetOptions();
  mode = $('#mode').find(":selected").val();
  switch (mode) {
    case 'payments': $('#statementsOptions').hide();
      $('#paymentOptions').show();
      $('#statementId').val('');
      setStatementOptions();

      break;
    case 'statements': $('#statementsOptions').show();
      $('#paymentOptions').hide();
      if (statements.length == 0) {
        fetch_statement();
      }
      break;
    default: $('#paymentOptions').show();
      $('#statementsOptions').hide();
      $('#mode').val('payments');
  }
}

function checkKey() {
  if (key == '') {
    key = $('#secret').val();
  } else if (key != $('#secret').val()) {
    statements = [];
    key = $('#secret').val();
  }
  if (mode == 'statements' && statements.length == 0) {
    fetch_statement();
  }
}

function fetch_statement() {
  console.log('triggered');

  if ($("input[name=secret]").val() != '') {

    blockPage();
    var temp_url = urls[mode] + "?from=2019-02-07&to=" + today;
    showMessage('primary', `Fetching statements..`);

    $.ajax({
      url: temp_url,
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", $("input[name=secret]").val())
      },
      type: 'GET',
    //   crossOrigin: null,
    //   crossDomain: true,
      contentType: 'text/csv',
      success: function (response) {
        console.log(response);
        statements = csvToJson(response);
        setStatements();
        res = response;
        unblockPage();
        showMessage('success', `Statements fetched successfully`);
      },
      error: function (response) {
        console.log(response);
        res = response;
        unblockPage();
        showMessage('danger', `${response.statusText} ${response.status}`)
      }
    });
  }
}

function csvToJson(data) {
  const lines = data.split("\r\n");
  /* Store the converted result into an array */
  const csvToJsonResult = [];

  /* Store the CSV column headers into seprate variable */
  const headers = lines[0].split(",");

  /* Iterate over the remaning data rows */
  for (let i = 1; i < lines.length - 1; i++) {
    /* Empty object to store result in key value pair */
    const jsonObject = {}
    /* Store the current array element */
    const currentArrayString = lines[i]
    let string = ''

    let quoteFlag = 0
    for (let character of currentArrayString) {
      if (character === '"' && quoteFlag === 0) {
        quoteFlag = 1
      }
      else if (character === '"' && quoteFlag == 1) quoteFlag = 0
      if (character === ',' && quoteFlag === 0) character = '|'
      if (character !== '"') string += character
    }
    let jsonProperties = string.split("|");

    for (let j in headers) {
      if (jsonProperties[j].includes(",")) {
        jsonObject[headers[j]] = jsonProperties[j]
          .split(",").map(item => item.trim())
      }
      else jsonObject[headers[j]] = jsonProperties[j]
    }
    /* Push the genearted JSON object to resultant array */
    csvToJsonResult.push(jsonObject)
  }
  /* Convert the final array to JSON */
  // x=csvToJsonResult;
  return csvToJsonResult;
}

function jsonToCsv(data) {

  var fields = Object.keys(data[0])
  var replacer = function (key, value) { return value === null ? '' : value }
  var csv = data.map(function (row) {
    return fields.map(function (fieldName) {
      return JSON.stringify(row[fieldName], replacer)
    }).join(',')
  })
  csv.unshift(fields.join(',')) // add header column
  csv = csv.join('\r\n');
  console.log(csv)
  return csv;
}

function getCsv(data) {
  // Creating a Blob for having a csv file format
  // and passing the data with type
  const blob = new Blob([data], { type: 'text/csv' });

  // Creating an object for downloading url
  const url = window.URL.createObjectURL(blob)

  // Creating an anchor(a) tag of HTML
  const a = document.createElement('a')

  // Passing the blob downloading url
  a.setAttribute('href', url)

  // Setting the anchor tag attribute for downloading
  // and passing the download file name
  var name = selected_statement;
  if (selected_currency != '' || selected_payout != '')
    name += `-${selected_currency}${selected_payout}`;
  if (name == '')
    name = `${mode}-${$('#from').val().replaceAll('-', '')}-${$('#to').val().replaceAll('-', '')}`;
  a.setAttribute('download', `${name}.csv`);

  // Performing a download with click
  a.click()
}

function setStatements() {
  for (var i = 0; i < statements.length; i++) {
    if (statements_ids.includes(statements[i]['Statement ID'])) {
      statement_currencies[statements[i]['Statement ID']].push(statements[i]['Currency']);
      statement_payouts[statements[i]['Statement ID']].push(statements[i]['Payout Id']);
    }
    else {
      statements_ids.push(statements[i]['Statement ID']);
      statement_currencies[statements[i]['Statement ID']] = [statements[i]['Currency']];
      statement_payouts[statements[i]['Statement ID']] = [statements[i]['Payout Id']];
      $("#statementId").append($('<option>', {
        value: statements[i]['Statement ID'],
        text: statements[i]['Statement ID'] + ': ' + statements[i]['Payout Start Date'].substring(0, 10) + " - " + statements[i]['Payout End Date'].substring(0, 10)
      }));
    }
  }
}

function setStatementOptions() {
  selected_statement = $('#statementId').val();
  $("#currency").empty();
  $("#currency").append($('<option>', {
    value: '',
    text: 'Select..'
  }));
  $("#currency").prop('disabled', true);
  selected_currency = '';
  $("#payoutId").empty();
  $("#payoutId").append($('<option>', {
    value: '',
    text: 'Select..'
  }));
  $("#payoutId").prop('disabled', true);
  selected_payout = '';

  $("#statementId").prop('disabled', false);

  if (selected_statement != '') {
    $("#limit").prop('disabled', true).val('');
    $("#to").prop('disabled', true).val('');
    $("#from").prop('disabled', true).val('');
    var curr = statement_currencies[selected_statement];
    var payouts = statement_payouts[selected_statement];

    for (var i = 0; i < curr.length; i++) {
      $("#currency").append($('<option>', {
        value: curr[i],
        text: curr[i]
      }));
    }
    $("#currency").prop('disabled', false);

    for (var i = 0; i < payouts.length; i++) {
      $("#payoutId").append($('<option>', {
        value: payouts[i],
        text: payouts[i]
      }));
    }
    $("#payoutId").prop('disabled', false);
  } else {
    $("#limit").prop('disabled', false);
    $("#to").prop('disabled', false);
    $("#from").prop('disabled', false);
  }
}

function setPayoutId() {
  selected_payout = $('#payoutId').val();
  $('#currency').val('');
  selected_currency = '';
}
function setCurrency() {
  selected_currency = $('#currency').val();
  $('#payoutId').val('');
  selected_payout = '';
}

function applyFilters(csvData, type) {
  var data = csvToJson(csvData);
  var limit = $('#limit').val() != '' ? parseInt($('#limit').val()) : 0;
  var reference = $('#reference').val();

  if (type == 'payments') {
    if (limit != 0) {
      var payment_ids = [...new Set(data.map(a => a['Payment ID']))]
      var payment_ids_sliced = payment_ids.slice(0, limit)
      var limitArray = data.filter(function (el) {
        return payment_ids_sliced.includes(el['Payment ID']);
      });
      data = limitArray;
    }
    if (reference != '') {
      var refArray = data.filter(function (el) {
        return el['Reference'] == reference;
      });
      data = refArray;
    }
  } else {
    if (limit != 0) {
      var slicedData = data.slice(0, limit);
      data = slicedData;
    }
  }
  return data;
}

// submit start
$("#getRes").click(function () {

  blockPage();
  var error = '';

  $(document).ready(function () {
    // secret key check
    if ($("input[name=secret]").val() == '') {
      error = `Set the secret key to make a request.`;
    }
    else {
      var req_url = urls[mode];
      var from = $('#from').val();
      var to = $('#to').val();
      console.log(from + " " + to);


      if (from != '' && to != '') {
        req_url += "?from=" + from + "&to=" + to;
        if ($('#breakdown').is(":checked")) {
          req_url += "&include=payout_breakdown";
        }
        // choose which endpoint to hit based on parameters
      } else if (mode == "statements") {

        req_url = urls['statement'];
        var statementId = $('#statementId').val();
        var payoutId = $('#payoutId').val();
        var currency = $('#currency').val();

        if (statementId != '') {
          req_url = req_url.replace('{StatementId}', statementId);

          if (payoutId != '') {
            req_url += "?payout_id=" + payoutId;
          } else if (currency != '') {
            req_url += "?payout_currency=" + currency;
          }
        } else {
          //Throw error
          error = `Choose the start and end dates to make a request. Or choose a statement ID from the list.`;

        }
      } else {
        error = `Choose the start and end dates to make a request`;
      }
    }
    if (error != '') {
      showMessage('danger', error);
      unblockPage();
    } else {
      console.log(req_url);
      showMessage('primary', `Processing your request, this might take few minutes...`);
      $.ajax({
        url: req_url,
        beforeSend: function (xhr) {
          xhr.setRequestHeader("Authorization", $("input[name=secret]").val())
        },
        type: 'GET',
        contentType: 'text/csv',
        success: function (response) {
          console.log(response);
          var json_local = applyFilters(response, mode);
          var csv_local = jsonToCsv(json_local);
          getCsv(csv_local);
          res = response;
          unblockPage();
          showMessage('success', `Your request has been processed and the download should have started!`);
        },
        error: function (response) {
          unblockPage();
          console.log(response);
          showMessage('danger', `${response.statusText} ${response.status}`)
        }
      });
    }
  });
});


