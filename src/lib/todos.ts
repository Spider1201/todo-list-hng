import { desc, eq } from 'drizzle-orm';

import { getDb, type Database } from '@/db';
import { todos, type Todo } from '@/db/schema';
import type { CreateTodoInput, UpdateTodoInput } from '@/lib/validators/todo';

/**
 * Data access for the todo resource. Every function accepts an optional
 * `Database` so tests can pass an isolated client (see AGENTS.md).
 */

/** All todos, newest first. */
export async function listTodos(db: Database = getDb()): Promise<Todo[]> {
  return db.select().from(todos).orderBy(desc(todos.createdAt));
}

/** The todo with `id`, or `undefined` when it does not exist. */
export async function findTodoById(id: string, db: Database = getDb()): Promise<Todo | undefined> {
  const [row] = await db.select().from(todos).where(eq(todos.id, id)).limit(1);
  return row;
}

/** Insert a todo and return the stored row. */
export async function createTodo(input: CreateTodoInput, db: Database = getDb()): Promise<Todo> {
  const [row] = await db.insert(todos).values({ title: input.title }).returning();

  if (row === undefined) {
    throw new Error('Insert returned no row.');
  }
  return row;
}

/**
 * Apply a partial update. Returns the updated row, or `undefined` when no todo
 * has that id.
 */
export async function updateTodo(
  id: string,
  input: UpdateTodoInput,
  db: Database = getDb(),
): Promise<Todo | undefined> {
  const changes: Partial<Pick<Todo, 'title' | 'isCompleted' | 'updatedAt'>> = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) {
    changes.title = input.title;
  }
  if (input.isCompleted !== undefined) {
    changes.isCompleted = input.isCompleted;
  }

  const [row] = await db.update(todos).set(changes).where(eq(todos.id, id)).returning();
  return row;
}

/** Delete a todo. Returns `true` when a row was removed. */
export async function deleteTodo(id: string, db: Database = getDb()): Promise<boolean> {
  const rows = await db.delete(todos).where(eq(todos.id, id)).returning({ id: todos.id });
  return rows.length > 0;
}
