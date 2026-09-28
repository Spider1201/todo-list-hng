import {
  internalError,
  jsonNoContent,
  jsonOk,
  notFoundError,
  readJsonBody,
  validationError,
} from '@/lib/http';
import { deleteTodo, findTodoById, updateTodo } from '@/lib/todos';
import { todoIdSchema, updateTodoSchema } from '@/lib/validators/todo';

/** Next passes dynamic route params as a promise; `await` them before use. */
interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Validate the `[id]` route param. Returns the id on success, or the `400`
 * response the caller should return as-is.
 */
async function resolveId(context: RouteContext): Promise<{ id: string } | Response> {
  const { id } = await context.params;
  const parsed = todoIdSchema.safeParse(id);
  return parsed.success ? { id: parsed.data } : validationError(parsed.error);
}

/** GET /api/todos/[id] - a single todo. */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const resolved = await resolveId(context);
  if (resolved instanceof Response) {
    return resolved;
  }

  try {
    const todo = await findTodoById(resolved.id);
    return todo === undefined ? notFoundError() : jsonOk(todo);
  } catch (error) {
    return internalError(error, 'Failed to load the todo.');
  }
}

/** PATCH /api/todos/[id] - update `title` and/or `isCompleted`. */
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const resolved = await resolveId(context);
  if (resolved instanceof Response) {
    return resolved;
  }

  const parsed = updateTodoSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const todo = await updateTodo(resolved.id, parsed.data);
    return todo === undefined ? notFoundError() : jsonOk(todo);
  } catch (error) {
    return internalError(error, 'Failed to update the todo.');
  }
}

/** DELETE /api/todos/[id] - remove a todo; `404` when it does not exist. */
export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const resolved = await resolveId(context);
  if (resolved instanceof Response) {
    return resolved;
  }

  try {
    const deleted = await deleteTodo(resolved.id);
    return deleted ? jsonNoContent() : notFoundError();
  } catch (error) {
    return internalError(error, 'Failed to delete the todo.');
  }
}
