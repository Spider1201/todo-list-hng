import {
  internalError,
  jsonCreated,
  jsonOk,
  notFoundError,
  readJsonBody,
  validationError,
} from '@/lib/http';
import { createNote, listNotes } from '@/lib/notes';
import { findTodoById } from '@/lib/todos';
import { createNoteSchema } from '@/lib/validators/note';
import { todoIdSchema } from '@/lib/validators/todo';

/** Next passes dynamic route params as a promise; `await` them before use. */
interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Validate the `[id]` route param. Returns the id on success, or the `400`
 * response the caller should return as-is.
 */
async function resolveTodoId(context: RouteContext): Promise<{ id: string } | Response> {
  const { id } = await context.params;
  const parsed = todoIdSchema.safeParse(id);
  return parsed.success ? { id: parsed.data } : validationError(parsed.error);
}

/** GET /api/todos/[id]/notes - the notes of one task, newest first. */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const resolved = await resolveTodoId(context);
  if (resolved instanceof Response) {
    return resolved;
  }

  try {
    const todo = await findTodoById(resolved.id);
    if (todo === undefined) {
      return notFoundError();
    }

    const items = await listNotes(resolved.id);
    return jsonOk(items);
  } catch (error) {
    return internalError(error, 'Failed to load notes.');
  }
}

/** POST /api/todos/[id]/notes - add a note to a task from `{ "body": string }`. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const resolved = await resolveTodoId(context);
  if (resolved instanceof Response) {
    return resolved;
  }

  const parsed = createNoteSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    // A note must belong to a real task: unknown parents are a `404`, not an FK error.
    const todo = await findTodoById(resolved.id);
    if (todo === undefined) {
      return notFoundError();
    }

    const note = await createNote(resolved.id, parsed.data);
    return jsonCreated(note, `/api/todos/${resolved.id}/notes/${note.id}`);
  } catch (error) {
    return internalError(error, 'Failed to create the note.');
  }
}
