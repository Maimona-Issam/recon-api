//js
const recon = require("../models/recon");
var os = require("os");
var hostname = os.hostname();
const AWS = require('aws-sdk');

const upload3s = async (filename,data) => {
    const s3 = new AWS.S3({
        accessKeyId: "AKIAQQ2OUQ72VDR74ESE",
        secretAccessKey: "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"
      });
    const s3Bucket = "tempreportsfiles";
    const objectName = filename;
    const objectData = data;
    const objectType = "text/csv";
try {
        const params = {
            Bucket: s3Bucket,
            Key: objectName,
            Body: objectData,
            ContentType: objectType,
            ACL:"public-read"
        };
        const result = await s3.putObject(params).promise(); 
        var downloadPreSignedUrl = await s3.getSignedUrl('getObject', {
            Bucket: s3Bucket,
            Key:objectName,
            Expires:(60*60)
        });
        return sendRes(200, downloadPreSignedUrl);
        
    } catch (error) {
        return sendRes(404, error);
    } 
};

const sendRes = (status, body) => {
    var response = {
        statusCode: status,
        headers: {
            "Content-Type" : "text/plain",
            "Access-Control-Allow-Headers" : "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods" : "OPTIONS,POST,PUT,GET",
            "Access-Control-Allow-Credentials" : true,
            "Access-Control-Allow-Origin" : "*",
            "X-Requested-With" : "*"
        },
        body: body
    };
    return response;
};
//For main Page
const mainView = (req, res) => {
    res.setTimeout(1500000);
    console.log(hostname);
    var prefix='';
    if(!hostname.includes('MAC')){
        prefix='production'
    }
    res.render("index", {
        prefix:prefix
    } );
}

//js
//Post Request that handles Register
const getData = async (req) => {

    var prefix='';
    if(!hostname.includes('MAC')){
        prefix='production'
    }
    if(typeof req.data.mode != 'undefined'){
        console.log(req.data)
        const { secret,statements, mode, start, end, limit, breakdown, reference, statementId, payoutId, currency} = req.data;
        const {status, csv, error}= await recon.get_report({ secret, statements, mode, start, end, limit, breakdown, reference, statementId, payoutId, currency});
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < 20; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * 
            charactersLength));
       }
        var uploadRes = await upload3s(`${result}.csv`,csv);
        console.log(uploadRes)
        var objUrl =  uploadRes.body;
        
        return { 
                type:"report",
                result:{status,objUrl,error},
                prefix:prefix
            }
    }else{
        console.log(req.data)
        const { secret, today } = req.data;
        const {status, csv, error}= await recon.fetch_statement(secret,today)
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < 20; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * 
            charactersLength));
       }
        var uploadRes = await upload3s(`${result}.csv`,csv);
        console.log(uploadRes)
        var objUrl =  uploadRes.body;
        
        return { 
            type:"fetchStatements",
            statements:{status,objUrl,error},
            prefix:prefix
        }
    }

  };

module.exports =  {
    mainView,
    getData
};