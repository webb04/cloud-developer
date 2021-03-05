import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { parseUserId } from '../../auth/utils'

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId

  const authorization = event.headers.Authorization;
  const split = authorization.split(' ')
  const jwtToken = split[1]

  const XAWS = AWSXRay.captureAWS(AWS)
  const docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient()

  const userId = parseUserId(jwtToken)
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
    ConditionExpression: 'todoId = :todoId and createdAt = :createdAt',
    ExpressionAttributeValues: {
      ':todoId': todoId,
      ':createdAt': todoItem.createdAt
    }
  }

  await docClient.delete(params).promise()

  return {
    statusCode: 204,
    body: ''
  };
}
