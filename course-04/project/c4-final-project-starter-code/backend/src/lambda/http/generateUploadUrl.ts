import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { parseUserId } from '../../auth/utils'
import * as uuid from 'uuid';
import { TodoItem } from '../../models/TodoItem'

const bucketName = process.env.ATTACHMENTS_S3_BUCKET
const urlExpiration = process.env.SIGNED_URL_EXPIRATION

const XAWS = AWSXRay.captureAWS(AWS)
const s3 = new XAWS.S3({
  signatureVersion: 'v4'
})

function getUploadUrl(imageId: string) {
  return s3.getSignedUrl('putObject', {
    Bucket: bucketName,
    Key: imageId,
    Expires: urlExpiration
  })
}

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId
  const authorization = event.headers.Authorization;
  const split = authorization.split(' ')
  const jwtToken = split[1]

  const id = uuid.v4();
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

  const todoItem = result.Items[0] as TodoItem;

  const params = {
    TableName: process.env.TODOS_TABLE,
    Key: {
      todoId,
      createdAt: todoItem.createdAt
    },
    UpdateExpression: 'set attachmentUrl = :attachmentUrl',
    ExpressionAttributeValues: {
      ':attachmentUrl': `https://${bucketName}.s3.amazonaws.com/${id}`
    },
    ReturnValues: 'UPDATED_NEW'
  }

  docClient.update(params).promise();

  const url = getUploadUrl(id)

  return {
    statusCode: 200,
    body: JSON.stringify({
      uploadUrl: url
    })
  }
}
