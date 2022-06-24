  exports.fetch_statement = async function(sk,today) {

    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

    console.log('triggered');
    var temp_url = `https://api.checkout.com/reporting/statements/download?from=2019-02-07&to=${today}`;

    try{
      const headers = {
          Authorization: sk
      };
      const response = await fetch(temp_url, {
          method: "GET",
          headers:headers,
      });
      console.log(response)
      if(response.ok){
        const txt = await response.text();
        // console.log(typeof txt);
        // console.log(txt);
        return {status:'s',csv:txt}
      }else{
        return {status:'f',error:`${response.status} ${response.statusText}`}
      }
    }catch(err){
      return {status:'f',error:err}
    }
  }


  exports.get_report = async function(data) {
    console.log('triggered');

    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    var urls = {
      'payments': 'https://api.checkout.com/reporting/payments/download',
      'statement': 'https://api.checkout.com/reporting/statements/{StatementId}/payments/download',
      'statements': 'https://api.checkout.com/reporting/statements/download',
    }
    var err='';
    const mode = data.mode;
    var req_url = urls[mode];
    const from = data.start;
    const to = data.end;
    console.log(from + " " + to);

    if (typeof from != 'undefined' && typeof to != 'undefined' && from != '' && to != '') {
      req_url += "?from=" + from + "&to=" + to;
      if (typeof data.breakdown != 'undefined') {
        req_url += "&include=payout_breakdown";
      }
      // choose which endpoint to hit based on parameters
    } else if (mode == "statements") {

      req_url = urls['statement'];
      const statementId = data.statementId;
      const payoutId = data.payoutId;
      const currency = data.currency;

      if (typeof statementId != 'undefined' && statementId != '') {
        req_url = req_url.replace('{StatementId}', statementId);

        if (typeof payoutId != 'undefined' && payoutId != '') {
          req_url += "?payout_id=" + payoutId;
        } else if (typeof currency != 'undefined' && currency != '') {
          req_url += "?payout_currency=" + currency;
        }
      } else {
        //Throw error
        err = `Choose the start and end dates to make a request. Or choose a statement ID from the list.`;

      }
    } else {
      err = `Choose the start and end dates to make a request`;
    }
    if (err != '') {
      return{
        status:'f',
        error:err,
      }
    } else {
      try{
        const headers = {
            Authorization: data.secret
        };
        const response = await fetch(req_url, {
            method: "GET",
            headers:headers,
        });
        console.log(response)
        const txt = await response.text();
    
      return {
        status:'s',
        csv:txt,
      }
    }catch(err){
      return {
        status:'f',
        error:err,
      }
    }
    }
  }
