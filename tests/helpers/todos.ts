import type { Todo } from '@/db/schema';

/** Fixed UUID used across tests so assertions stay readable. */
export const TODO_ID = '3f1b0d24-9c4a-4a5e-8f2d-1c6b7a8d9e0f';

export const CREATED_AT = new Date('2026-01-01T12:00:00.000Z');

/** Build a complete `Todo` row, overriding only what a test cares about. */
export function buildTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: TODO_ID,
    title: 'Buy milk',
    isCompleted: false,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

/** The JSON shape the API returns: timestamps travel as ISO strings. */
export interface JsonTodo {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Convert a `Todo` row into the payload clients actually receive. */
export function toJsonTodo(todo: Todo): JsonTodo {
  return {
    id: todo.id,
    title: todo.title,
    isCompleted: todo.isCompleted,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

/** Request with an optional JSON body; pass a string to send malformed JSON. */
export function jsonRequest(
  method: 'POST' | 'PATCH',
  body?: unknown,
  path = '/api/todos',
): Request {
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: bodyText,
  });
}

/** Bare request with no body, for GET and DELETE. */
export function plainRequest(method: 'GET' | 'DELETE', path = '/api/todos'): Request {
  return new Request(`http://localhost${path}`, { method });
}

/** Next.js route context - dynamic params arrive as a promise. */
export function routeContext(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}
