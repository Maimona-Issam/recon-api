const AWS = require('aws-sdk')
const {getData} = require('./controllers/mainController')
const dynamo = new AWS.DynamoDB.DocumentClient()

const CONNECTION_DB_TABLE = process.env.CONNECTION_DB_TABLE

const successfullResponse = {
  statusCode: 200,
  body: 'Success'
}

const failedResponse = (statusCode, error) => ({
  statusCode,
  body: error
})
module.exports.handleRequests= async (event, context, callback)=>{

    switch (event.requestContext.routeKey) {
        case '$connect':
            await addConnection(event.requestContext.connectionId);
            break;
        case '$disconnect':
            await deleteConnection(event.requestContext.connectionId);
            break;
        case 'getReport':
            const lambda = new AWS.Lambda();
            await lambda.invoke({
                FunctionName: process.env.WEBSOCKET_REPORT_GENERATION_LAMBDA_NAME,
                InvocationType: 'Event',
                Payload: JSON.stringify(event),
            }).promise();
            break;
        case 'heartbeat':
            heartbeat(event);
            console.log('heartbeat ok')
            break;
        case '$default':
        default:
            callback(null, failedResponse(404, 'No event found'));
    }
    callback(null, successfullResponse);
}
const heartbeat = (event) => {
    console.log(event);
    var requestContext=event.requestContext;
    const connectionId = requestContext.connectionId;
        try {
            const endpoint =
                event.requestContext.domainName + '/' + event.requestContext.stage
            const apigwManagementApi = new AWS.ApiGatewayManagementApi({
                apiVersion: '2018-11-29',
                endpoint: endpoint
            })
    
            const params = {
                ConnectionId: connectionId,
                Data: JSON.stringify({"type":"heartbeat"})
            }
            return apigwManagementApi.postToConnection(params).promise()
        } catch (error) {
            console.log(error)
            throw error;
        }
    };

module.exports.generate = async (event, context, callback) =>{

  console.log(event);
  var requestContext=event.requestContext;
  const connectionId = requestContext.connectionId;
  
  var postData= await getData(JSON.parse(event.body));

    if (typeof postData === 'object') {
        console.log('It was an object')
        postData = JSON.stringify(postData)
    } else if (typeof postData === 'string') {
        console.log('It was a string')
    }
    try {
        const endpoint =
            event.requestContext.domainName + '/' + event.requestContext.stage
        const apigwManagementApi = new AWS.ApiGatewayManagementApi({
            apiVersion: '2018-11-29',
            endpoint: endpoint
        })

        const params = {
            ConnectionId: connectionId,
            Data: postData
        }
        await apigwManagementApi.postToConnection(params).promise();
    } catch (error) {
        console.log(error)
        throw error;
    }
    callback(null, successfullResponse);
}

const addConnection = (connectionId) => {
  const params = {
    TableName: CONNECTION_DB_TABLE,
    Item: {
      connectionId: connectionId
    }
  }

  return dynamo.put(params).promise()
}

const deleteConnection = (connectionId) => {
  const params = {
    TableName: CONNECTION_DB_TABLE,
    Key: {
      connectionId: connectionId
    }
  }

  return dynamo.delete(params).promise()
}