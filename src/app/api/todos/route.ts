import { internalError, jsonCreated, jsonOk, readJsonBody, validationError } from '@/lib/http';
import { createTodo, listTodos } from '@/lib/todos';
import { createTodoSchema } from '@/lib/validators/todo';

/** GET /api/todos - every todo, newest first. */
export async function GET(): Promise<Response> {
  try {
    const items = await listTodos();
    return jsonOk(items);
  } catch (error) {
    return internalError(error, 'Failed to load todos.');
  }
}

/** POST /api/todos - create a todo from `{ "title": string }`. */
export async function POST(request: Request): Promise<Response> {
  const parsed = createTodoSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const todo = await createTodo(parsed.data);
    return jsonCreated(todo, `/api/todos/${todo.id}`);
  } catch (error) {
    return internalError(error, 'Failed to create the todo.');
  }
}
