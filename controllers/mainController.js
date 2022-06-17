//js
const recon = require("../models/recon");

//For main Page
const mainView = (req, res) => {
    res.setTimeout(1500000);
    res.render("index", {
    } );
}

//js
//Post Request that handles Register
const getData = async (req, res) => {
    res.setTimeout(1500000);
    if(typeof req.body.mode != 'undefined'){
        console.log(req.body)
        const { secret,statements, mode, start, end, limit, breakdown, reference, statementId, payoutId, currency} = req.body;
        const result= await recon.get_report({ secret, statements, mode, start, end, limit, breakdown, reference, statementId, payoutId, currency})
        res.render("index", { 
            secret:secret,
            result:result
        } );
    }else{
        console.log(req.body)
        const { secret, today } = req.body;
        const result= await recon.fetch_statement(secret,today)
        res.render("index", { 
            secret:secret,
            statements:result
        } );
    }

  };

module.exports =  {
    mainView,
    getData
};