import { z } from 'zod';

/** Longest note body we accept; keep in sync with the zod schema below. */
export const NOTE_MAX_LENGTH = 2000;

/** Route params arrive as strings, so validate them as UUIDs before hitting the database. */
export const noteIdSchema = z.uuid({ error: 'noteId must be a valid UUID.' });

const bodySchema = z
  .string({ error: 'body must be a string.' })
  .trim()
  .min(1, { error: 'body must not be empty.' })
  .max(NOTE_MAX_LENGTH, { error: `body must be at most ${NOTE_MAX_LENGTH} characters.` });

/** Body of `POST /api/todos/[id]/notes`. Unknown keys are rejected, not ignored. */
export const createNoteSchema = z.strictObject({
  body: bodySchema,
});

/**
 * Body of `PATCH /api/todos/[id]/notes/[noteId]`. A note has a single editable
 * field, so "an update" always means "a new body".
 */
export const updateNoteSchema = z.strictObject({
  body: bodySchema,
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
