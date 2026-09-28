import type { Note } from '@/db/schema';
import { TODO_ID } from './todos';

export { TODO_ID };

/** Fixed UUID used across the note tests so assertions stay readable. */
export const NOTE_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

export const NOTE_CREATED_AT = new Date('2026-01-02T09:30:00.000Z');

/** Build a complete `Note` row, overriding only what a test cares about. */
export function buildNote(overrides: Partial<Note> = {}): Note {
  return {
    id: NOTE_ID,
    todoId: TODO_ID,
    body: 'Remember the oat milk',
    createdAt: NOTE_CREATED_AT,
    updatedAt: NOTE_CREATED_AT,
    ...overrides,
  };
}

/** The JSON shape the API returns: timestamps travel as ISO strings. */
export interface JsonNote {
  id: string;
  todoId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** Convert a `Note` row into the payload clients actually receive. */
export function toJsonNote(note: Note): JsonNote {
  return {
    id: note.id,
    todoId: note.todoId,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

/** Sibling notes use a different id; handy for two-row list assertions. */
export const OTHER_NOTE_ID = 'b7c9e667-7425-40de-944b-e07fc1f90ae7';

/** Route context for `/api/todos/[id]/notes/[noteId]` - params arrive as a promise. */
export function noteRouteContext(
  todoId: string,
  noteId: string,
): { params: Promise<{ id: string; noteId: string }> } {
  return { params: Promise.resolve({ id: todoId, noteId }) };
}
