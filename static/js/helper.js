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
$('#today').val(today);
const elem = document.getElementById('rangeDate');
const datepicker = new DateRangePicker(elem, {
  // ...options
  minDate: "2019-02-07",
  maxDate: today,
  format: "yyyy-mm-dd"
});


var mode = 'payments';
var limit='0';
var reference='';
var key = '';
var statements = [];
var statements_ids = [];
var statement_currencies = {};
var statement_payouts = {};
var selected_statement = '';
var selected_payout = '';
var selected_currency = '';
changeMode();
let socket = new WebSocket("wss://6hhgusqi85.execute-api.us-east-1.amazonaws.com/production");
var x='';
var lastActivity;
socket.onopen = function(e) {
    console.log("[open] Connection established");
    console.log(new Date());
    lastActivity=new Date().getTime();
    keepAliveSocket();
};

socket.onmessage = function(event) {
    console.log(`[message] Data received from server: ${event.data}`);
    x=event.data;
    lastActivity=new Date().getTime();
    // keepAliveSocket();
    processResponse(JSON.parse(event.data));
};

socket.onclose = function(event) {
    console.log(new Date());
    lastActivity=new Date().getTime();
    if (event.wasClean) {
        console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        console.log('[close] Connection died');
    }
    showMessage('danger', `Your connection was disconnected, refresh the page and try again.`);
    unblockPage();
};

socket.onerror = function(error) {
    console.log(`[error] ${error.message}`);
    lastActivity=new Date().getTime();
    unblockPage();
    showMessage('danger', error.message);
};

function keepAliveSocket(){
  setTimeout(()=>{
    if(lastActivity && lastActivity-(new Date().getTime()) < 60000){
      var req={ "action": "heartbeat", "data": {} };
      socket.send(JSON.stringify(req));
    }else{
      keepAliveSocket();
    }
  }, 540000);
}

function processResponse(event){
    console.log(event.type);
    switch(event.type){
        case "heartbeat":
            lastActivity=new Date().getTime();
            keepAliveSocket();
          break;
        case "fetchStatements":
            var status= event.statements.status;
            if(status =='f'){
                showMessage('danger', event.statements.error);
            }else{
                var report_url=event.statements.objUrl;
                var csv_report= '';
                var request = new XMLHttpRequest();
                request.open('GET', report_url, true);
                request.send(null);
                request.onreadystatechange = function () {
                    if (request.readyState === 4 && request.status === 200) {
                        var type = request.getResponseHeader('Content-Type');
                        console.log(type);
                        if (type.indexOf("text") !== 1) {
                            console.log(request.responseText);
                            csv_report= request.responseText;
                            statements = csvToJson(csv_report,false);
                            setStatements();
                            showMessage('success', `Statements fetched successfully`);
                            unblockPage();
                        }
                    }
                }
            }
            break;
        case "report":
            var status= event.result.status;
            if(status =='f'){
                showMessage('danger', event.result.error);
            }else{
                var report_url=event.result.objUrl;
                var csv_report= '';
                showMessage('primary', `Getting your file ready...`);
                blockPage();
                var request = new XMLHttpRequest();
                request.open('GET', report_url, true);
                request.send(null);
                request.onreadystatechange = function () {
                    if (request.readyState === 4 && request.status === 200) {
                        var type = request.getResponseHeader('Content-Type');
                        console.log(type);
                        if (type.indexOf("text") !== 1) {
                            console.log(request.responseText);
                            csv_report= request.responseText;

                            limit = limit != '' ? parseInt(limit) : 0;
                            if(typeof reference =='undefined')
                                reference='';
                            
                            console.log(csv_report.length);
                            res=csv_report;
                            var json_local = applyFilters(csv_report, mode,limit,reference);

                            var csv_local = jsonToCsv(json_local);
                            getCsv(csv_local);
                            showMessage('success', `Your request has been processed and the download should have started!`);
                            unblockPage();
                    }
                }
            }
            }
            break;
    }
}


function unblockPage() {
    $('.loader').hide();
    $("#getRes").prop("disabled", false);
  }
  function blockPage() {
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

function setMode() {
  resetOptions();
  mode = $('#mode').find(":selected").val();
  changeMode();
}
function changeMode() {
  switch (mode) {
    case 'payments': $('#statementsOptions').hide();
      $('#paymentOptions').show();
      $('#statementId').val('');
      setStatementOptions();
      break;
    case 'statements': $('#statementsOptions').show();
      $('#paymentOptions').hide();
      if (statements.length == 0 && key != '') {
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
    $('#secretData').val(key);
    secretData
  } else if (key != $('#secret').val()) {
    statements = [];
    key = $('#secret').val();
    $('#secretData').val(key);
  }
  if (mode == 'statements' && statements.length == 0) {
    fetch_statement();
  }
}

function fetch_statement() {
  blockPage();
  showMessage('primary', `Fetching statements..`);
  var req={ "action": "getReport", "data": {"secret":key,"today":today} };
  socket.send(JSON.stringify(req));
}


function csvToJson(data,is_local) {
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
      if (character === ',' && quoteFlag === 0) {character = '|';}
      else if(character === ',' && !is_local) character=';';
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
  if(csvToJsonResult.length==0){
    const jsonObject = {}
    for (let j in headers) {
      jsonObject[headers[j]] = '';
    }
    csvToJsonResult.push(jsonObject);
  }
  /* Convert the final array to JSON */
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
    name = `${mode}-${$('#from').val().replace(/-/g, '')}-${$('#to').val().replace(/-/g, '')}`;
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
    $("#breakdown").prop('disabled', true).prop('checked',false);
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
    $("#breakdown").prop('disabled', false).prop('checked',false);
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

function applyFilters(csvData, type,limit,reference) {
  var data = csvToJson(csvData,false);
  console.log(type,limit,reference)

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

$('#getRes').click(function() {
  if(key!=''){
    blockPage();
    showMessage('primary', `Processing your request, this might take few minutes...`);
    limit=$('#limit').val();
    reference=$('#reference').val();
    var req={ "action": "getReport", "data": {"secret":key,"mode":mode,"start":$('#from').val(),'end':$('#to').val(),"limit":limit, "breakdown":$('#breakdown').val(), "reference":reference, "statementId":$('#statementId').val(), "payoutId":$('#payoutId').val(), "currency":$('#currency').val()} };
    socket.send(JSON.stringify(req));
  }else{
    showMessage('danger',`Set the secret key to make a request.`);
  }
});


