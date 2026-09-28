import { z } from 'zod';

/** Longest title we accept; keep in sync with the zod schema below. */
export const TITLE_MAX_LENGTH = 200;

/** Route params arrive as strings, so validate them as UUIDs before hitting the database. */
export const todoIdSchema = z.uuid({ error: 'id must be a valid UUID.' });

const titleSchema = z
  .string({ error: 'title must be a string.' })
  .trim()
  .min(1, { error: 'title must not be empty.' })
  .max(TITLE_MAX_LENGTH, { error: `title must be at most ${TITLE_MAX_LENGTH} characters.` });

/** Body of `POST /api/todos`. Unknown keys are rejected, not ignored. */
export const createTodoSchema = z.strictObject({
  title: titleSchema,
});

/** Body of `PATCH /api/todos/[id]` - at least one field must be present. */
export const updateTodoSchema = z
  .strictObject({
    title: titleSchema.optional(),
    isCompleted: z.boolean({ error: 'isCompleted must be a boolean.' }).optional(),
  })
  .refine((value) => value.title !== undefined || value.isCompleted !== undefined, {
    error: 'provide at least one of "title" or "isCompleted".',
  });

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
