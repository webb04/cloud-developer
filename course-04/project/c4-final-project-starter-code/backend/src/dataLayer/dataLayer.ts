import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'

const XAWS = AWSXRay.captureAWS(AWS)

function createDynamoDBClient() {
    return new XAWS.DynamoDB.DocumentClient()
}

export class TodosAccess {
    constructor(
        private readonly docClient: DocumentClient = createDynamoDBClient(),
        private readonly todosTable = process.env.TODOS_TABLE,
        private readonly todosUserIndex = process.env.TODOS_USER_INDEX
     ) {}

    async getAllTodos(userId: string): Promise<TodoItem[]> {        
        const result = await this.docClient.query({
            TableName: this.todosTable,
            IndexName: this.todosUserIndex,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId' : userId
            }
        }).promise()
        
        return result.Items as TodoItem[];
    }

    async getTodoItem(todoId: string, userId: string): Promise<TodoItem> {
        const result = await this.docClient.query({
            TableName: this.todosTable,
            IndexName: this.todosUserIndex,
            KeyConditionExpression: 'userId = :userId and todoId = :todoId',
            ExpressionAttributeValues: {
                ':userId' : userId,
                ':todoId' : todoId
            }
        }).promise()

        return result.Items[0] as TodoItem;
    }

    async createTodo(todo: TodoItem): Promise<TodoItem> {
        await this.docClient.put({
            TableName: this.todosTable,
            Item: todo
        }).promise()

        return todo;
    }

    async updateTodo(todoId: string, createdAt: string, update: TodoUpdate): Promise<void> {
        const params = {
            TableName: this.todosTable,
            Key: {
                "todoId": todoId,
                "createdAt": createdAt
            },
            UpdateExpression:
                'set #n = :name, done = :done, dueDate = :dueDate',
            ExpressionAttributeValues: {
                ':name': update.name,
                ':done': update.done,
                ':dueDate': update.dueDate,
            },
            ExpressionAttributeNames: {
                '#n': 'name'
            },
            ReturnValues: 'UPDATED_NEW'
        };
        
        this.docClient.update(params).promise()
    }

    async deleteTodo(todoId: string, createdAt: string): Promise<void> {
        const params = {
            TableName: this.todosTable,
            Key: {
                "todoId": todoId,
                "createdAt": createdAt
            },
            ConditionExpression:
                'todoId = :todoId and createdAt = :createdAt',
            ExpressionAttributeValues: {
                ':todoId': todoId,
                ':createdAt': createdAt
            }
        }

        await this.docClient.delete(params).promise();
    }

    async setItemUrl(todoId: string, createdAt: string, itemUrl: string): Promise<void> {
        const params = {
            TableName: this.todosTable,
            Key: {
                todoId,
                createdAt
            },
            UpdateExpression: 'set attachmentUrl = :attachmentUrl',
            ExpressionAttributeValues: {
                ':attachmentUrl': itemUrl
            },
            ReturnValues: 'UPDATED_NEW'
        }

        await this.docClient.update(params).promise();
    }

}