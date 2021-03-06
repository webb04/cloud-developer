import { TodoItem } from '../models/TodoItem'
import { TodosAccess } from '../dataLayer/dataLayer'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
import { parseUserId } from '../auth/utils'

import * as uuid from 'uuid'

const todosAccess = new TodosAccess()

export async function getAllTodos(jwtToken: string): Promise<TodoItem[]> {
    const userId = parseUserId(jwtToken);
    return todosAccess.getAllTodos(userId);
}

export async function createTodo(
  createTodoRequest: CreateTodoRequest,
  jwtToken: string
): Promise<TodoItem> {

  const itemId = uuid.v4()
  const userId = parseUserId(jwtToken)
  
  return todosAccess.createTodo({
    todoId: itemId,
    userId: userId,
    name: createTodoRequest.name,
    done: false,
    dueDate: createTodoRequest.dueDate,
    createdAt: new Date().toISOString(),
    attachmentUrl: ''
  })
}

export async function updateTodo(
    todoId: string, 
    updateTodoRequest: UpdateTodoRequest,
    jwtToken: string
  ): Promise<void> {
    const userId = parseUserId(jwtToken);
    const todoItem = await todosAccess.getTodoItem(todoId, userId);
    const { name, done, dueDate } = updateTodoRequest;
    await todosAccess.updateTodo(todoItem.todoId, todoItem.createdAt, {
      name,
      done,
      dueDate,
    })
}

export async function deleteTodo(
    itemId: string,
    jwtToken: string
  ): Promise<void> {
    const userId = parseUserId(jwtToken);
    const todoItem = await todosAccess.getTodoItem(itemId, userId);
    await todosAccess.deleteTodo(todoItem.todoId, todoItem.createdAt);
}

export async function setItemUrl(jwtToken: string, todoId: string, uploadUrl: string): Promise<void> {
  const userId = parseUserId(jwtToken);
  const todoItem = await todosAccess.getTodoItem(todoId, userId);
  await todosAccess.setItemUrl(todoItem.todoId, todoItem.createdAt, uploadUrl);
}

export async function getTodoItem(todoId: string, jwtToken: string): Promise<TodoItem> {
    const userId = parseUserId(jwtToken);
    return await todosAccess.getTodoItem(todoId, userId);
}