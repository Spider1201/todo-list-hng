import {
  internalError,
  jsonNoContent,
  jsonOk,
  notFoundError,
  readJsonBody,
  validationError,
} from '@/lib/http';
import { deleteNote, updateNote } from '@/lib/notes';
import { noteIdSchema, updateNoteSchema } from '@/lib/validators/note';
import { todoIdSchema } from '@/lib/validators/todo';

/** Next passes dynamic route params as a promise; `await` them before use. */
interface RouteContext {
  params: Promise<{ id: string; noteId: string }>;
}

interface ResolvedParams {
  todoId: string;
  noteId: string;
}

/**
 * Validate both route params. Returns the ids on success, or the `400` response
 * the caller should return as-is.
 */
async function resolveParams(context: RouteContext): Promise<ResolvedParams | Response> {
  const { id, noteId } = await context.params;

  const todo = todoIdSchema.safeParse(id);
  if (!todo.success) {
    return validationError(todo.error);
  }

  const note = noteIdSchema.safeParse(noteId);
  if (!note.success) {
    return validationError(note.error);
  }

  return { todoId: todo.data, noteId: note.data };
}

/** The `404` used by both verbs: the note is missing, or belongs to another task. */
const noteNotFound = (): Response => notFoundError('No note exists with that id on this task.');

/** PATCH /api/todos/[id]/notes/[noteId] - replace a note's body. */
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const resolved = await resolveParams(context);
  if (resolved instanceof Response) {
    return resolved;
  }

  const parsed = updateNoteSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const note = await updateNote(resolved.todoId, resolved.noteId, parsed.data);
    return note === undefined ? noteNotFound() : jsonOk(note);
  } catch (error) {
    return internalError(error, 'Failed to update the note.');
  }
}

/** DELETE /api/todos/[id]/notes/[noteId] - remove a note; `404` when it is not there. */
export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const resolved = await resolveParams(context);
  if (resolved instanceof Response) {
    return resolved;
  }

  try {
    const deleted = await deleteNote(resolved.todoId, resolved.noteId);
    return deleted ? jsonNoContent() : noteNotFound();
  } catch (error) {
    return internalError(error, 'Failed to delete the note.');
  }
}
