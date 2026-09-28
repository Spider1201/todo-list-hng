import { and, desc, eq } from 'drizzle-orm';

import { getDb, type Database } from '@/db';
import { notes, type Note } from '@/db/schema';
import type { CreateNoteInput, UpdateNoteInput } from '@/lib/validators/note';

/**
 * Data access for the note resource. Every function accepts an optional
 * `Database` so tests can pass an isolated client (see AGENTS.md).
 *
 * Reads and writes are always scoped by `todoId` as well as `noteId`, so a note
 * can never be reached through another task's URL.
 */

/** Notes of one todo, newest first (same order as the task list). */
export async function listNotes(todoId: string, db: Database = getDb()): Promise<Note[]> {
  return db.select().from(notes).where(eq(notes.todoId, todoId)).orderBy(desc(notes.createdAt));
}

/** The note with `noteId` when it belongs to `todoId`, otherwise `undefined`. */
export async function findNoteById(
  todoId: string,
  noteId: string,
  db: Database = getDb(),
): Promise<Note | undefined> {
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.todoId, todoId)))
    .limit(1);
  return row;
}

/** Insert a note on a todo and return the stored row. */
export async function createNote(
  todoId: string,
  input: CreateNoteInput,
  db: Database = getDb(),
): Promise<Note> {
  const [row] = await db.insert(notes).values({ todoId, body: input.body }).returning();

  if (row === undefined) {
    throw new Error('Insert returned no row.');
  }
  return row;
}

/**
 * Replace a note's body. Returns the updated row, or `undefined` when no note
 * with that id belongs to `todoId`.
 */
export async function updateNote(
  todoId: string,
  noteId: string,
  input: UpdateNoteInput,
  db: Database = getDb(),
): Promise<Note | undefined> {
  const [row] = await db
    .update(notes)
    .set({ body: input.body, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.todoId, todoId)))
    .returning();
  return row;
}

/** Delete a note. Returns `true` when a row was removed. */
export async function deleteNote(
  todoId: string,
  noteId: string,
  db: Database = getDb(),
): Promise<boolean> {
  const rows = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.todoId, todoId)))
    .returning({ id: notes.id });
  return rows.length > 0;
}
