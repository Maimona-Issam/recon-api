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

module.exports.connectHandler = (event, context, callback) => {
  addConnection(event.requestContext.connectionId)
    .then(() => {
      callback(null, successfullResponse)
    })
    .catch((err) => {
        console.log(err);
        console.log(JSON.stringify(err));
      callback(failedResponse(500, JSON.stringify(err)))
    })
}

module.exports.disconnectHandler = (event, context, callback) => {
  deleteConnection(event.requestContext.connectionId)
    .then(() => {
      callback(null, successfullResponse)
    })
    .catch((err) => {
        console.log(err);
        console.log(JSON.stringify(err));
      callback(failedResponse(500, JSON.stringify(err)))
    })
}

module.exports.defaultHandler = (event, context, callback) => {
  callback(null, failedResponse(404, 'No event found'))
}

module.exports.getReportHandler = (event, context, callback) => {
     send(event)
    .then(() => {
      callback(null, successfullResponse)
    })
    .catch((err) => {
        console.log(err);
        console.log(JSON.stringify(err));
      callback(failedResponse(500, JSON.stringify(err)))
    })
}


const send = (event) => {
  console.log(event);
  var requestContext=event.requestContext;
  const connectionId = requestContext.connectionId;
  return getData(JSON.parse(event.body)).then((postData)=>{

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
        return apigwManagementApi.postToConnection(params).promise()
    } catch (error) {
        console.log(error)
        throw error;
    }
});
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