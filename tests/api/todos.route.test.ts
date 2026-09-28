import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/todos/route';
import { buildTodo, jsonRequest, toJsonTodo, type JsonTodo } from '../helpers/todos';

const mocks = vi.hoisted(() => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
}));

vi.mock('@/lib/todos', () => ({
  listTodos: mocks.listTodos,
  createTodo: mocks.createTodo,
}));

interface ListBody {
  data: JsonTodo[];
}

interface ErrorBody {
  error: { code: string; message: string; details?: { path: (string | number)[] }[] };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /api/todos', () => {
  it('returns every todo with status 200', async () => {
    const todos = [buildTodo(), buildTodo({ id: 'a1b2c3d4-0000-4000-8000-000000000000' })];
    mocks.listTodos.mockResolvedValue(todos);

    const response = await GET();
    const body = (await response.json()) as ListBody;

    expect(response.status).toBe(200);
    expect(body.data).toEqual(todos.map(toJsonTodo));
  });

  it('returns an empty list when there are no todos', async () => {
    mocks.listTodos.mockResolvedValue([]);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ data: [] });
  });

  it('returns 500 INTERNAL_ERROR when the data layer fails', async () => {
    mocks.listTodos.mockRejectedValue(new Error('connection refused'));

    const response = await GET();
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('POST /api/todos', () => {
  it('creates a todo and returns 201 with a Location header', async () => {
    const todo = buildTodo({ title: 'Buy oat milk' });
    mocks.createTodo.mockResolvedValue(todo);

    const response = await POST(jsonRequest('POST', { title: 'Buy oat milk' }));

    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(`/api/todos/${todo.id}`);
    await expect(response.json()).resolves.toEqual({ data: toJsonTodo(todo) });
    expect(mocks.createTodo).toHaveBeenCalledWith({ title: 'Buy oat milk' });
  });

  it('trims the title before it reaches the data layer', async () => {
    mocks.createTodo.mockResolvedValue(buildTodo({ title: 'Buy milk' }));

    await POST(jsonRequest('POST', { title: '   Buy milk   ' }));

    expect(mocks.createTodo).toHaveBeenCalledWith({ title: 'Buy milk' });
  });

  it('returns 400 without calling the data layer when the title is missing', async () => {
    const response = await POST(jsonRequest('POST', {}));
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.[0]?.path).toEqual(['title']);
    expect(mocks.createTodo).not.toHaveBeenCalled();
  });

  it('returns 400 for an empty title', async () => {
    const response = await POST(jsonRequest('POST', { title: '  ' }));

    expect(response.status).toBe(400);
    expect(mocks.createTodo).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown key', async () => {
    const response = await POST(jsonRequest('POST', { title: 'Buy milk', isCompleted: true }));

    expect(response.status).toBe(400);
    expect(mocks.createTodo).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(jsonRequest('POST', '{ not json'));
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mocks.createTodo).not.toHaveBeenCalled();
  });

  it('returns 500 INTERNAL_ERROR when the insert fails', async () => {
    mocks.createTodo.mockRejectedValue(new Error('unique violation'));

    const response = await POST(jsonRequest('POST', { title: 'Buy milk' }));
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
