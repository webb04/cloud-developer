import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'

import { UpdateTodoRequest } from '../../requests/UpdateTodoRequest'
import { parseUserId } from '../../auth/utils'
import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId
  const updatedTodo: UpdateTodoRequest = JSON.parse(event.body)

  const authorization = event.headers.Authorization;
  const split = authorization.split(' ')
  const jwtToken = split[1]
  const userId = parseUserId(jwtToken)

  const XAWS = AWSXRay.captureAWS(AWS)
  const docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient()


  const result = await docClient.query({
    TableName: process.env.TODOS_TABLE,
    IndexName: process.env.TODOS_USER_INDEX,
    KeyConditionExpression: 'userId = :userId and todoId = :todoId',
    ExpressionAttributeValues: {
      ':userId' : userId,
      ':todoId' : todoId
    }
  }).promise()

  const todoItem = result.Items[0]

  const params = {
    TableName: process.env.TODOS_TABLE,
    Key: {
      "todoId": todoId,
      "createdAt": todoItem.createdAt
    },
    UpdateExpression: 'set #n = :name, done = :done, dueDate = :dueDate',
    ExpressionAttributeValues: {
      ':name': updatedTodo.name,
      ':done': updatedTodo.done,
      ':dueDate': updatedTodo.dueDate,
    },
    ExpressionAttributeNames: {
      '#n': 'name'
    },
    // ConditionExpression: 
    //    'userId = :userId',
    ReturnValues: 'UPDATED_NEW'
  };
        
  docClient.update(params).promise()
  
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
      "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
    },
    body: ''
  };
}
