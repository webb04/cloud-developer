import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'

import { CreateTodoRequest } from '../../requests/CreateTodoRequest'
import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { parseUserId } from '../../auth/utils'
import * as uuid from 'uuid';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const authorization = event.headers.Authorization
  const split = authorization.split(' ')
  const jwtToken = split[1]

  const newTodo: CreateTodoRequest = JSON.parse(event.body)
  
  const XAWS = AWSXRay.captureAWS(AWS)
  const docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient()

  const itemId = uuid.v4()
  const userId = parseUserId(jwtToken)

  const item = {
      todoId: itemId,
      userId: userId,
      name: newTodo.name,
      done: false,
      dueDate: newTodo.dueDate,
      createdAt: new Date().toISOString()
  }
  
  await docClient.put({
    TableName: process.env.TODOS_TABLE,
    Item: item
  }).promise()
  
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
      "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
    },
    body: JSON.stringify({
      item
    })
  }
}
