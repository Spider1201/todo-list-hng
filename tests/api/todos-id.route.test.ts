import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, GET, PATCH } from '@/app/api/todos/[id]/route';
import {
  TODO_ID,
  buildTodo,
  jsonRequest,
  plainRequest,
  routeContext,
  toJsonTodo,
  type JsonTodo,
} from '../helpers/todos';

const mocks = vi.hoisted(() => ({
  findTodoById: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

vi.mock('@/lib/todos', () => ({
  findTodoById: mocks.findTodoById,
  updateTodo: mocks.updateTodo,
  deleteTodo: mocks.deleteTodo,
}));

interface ItemBody {
  data: JsonTodo;
}

interface ErrorBody {
  error: { code: string; message: string; details?: { path: (string | number)[] }[] };
}

const unknownId = 'a1b2c3d4-0000-4000-8000-000000000000';
const malformedId = 'not-a-uuid';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /api/todos/[id]', () => {
  it('returns the todo with status 200', async () => {
    const todo = buildTodo();
    mocks.findTodoById.mockResolvedValue(todo);

    const response = await GET(plainRequest('GET', `/api/todos/${TODO_ID}`), routeContext(TODO_ID));
    const body = (await response.json()) as ItemBody;

    expect(response.status).toBe(200);
    expect(body.data).toEqual(toJsonTodo(todo));
    expect(mocks.findTodoById).toHaveBeenCalledWith(TODO_ID);
  });

  it('returns 404 NOT_FOUND when the todo does not exist', async () => {
    mocks.findTodoById.mockResolvedValue(undefined);

    const response = await GET(
      plainRequest('GET', `/api/todos/${unknownId}`),
      routeContext(unknownId),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for an id that is not a UUID', async () => {
    const response = await GET(
      plainRequest('GET', `/api/todos/${malformedId}`),
      routeContext(malformedId),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mocks.findTodoById).not.toHaveBeenCalled();
  });

  it('returns 500 INTERNAL_ERROR when the lookup fails', async () => {
    mocks.findTodoById.mockRejectedValue(new Error('connection refused'));

    const response = await GET(plainRequest('GET', `/api/todos/${TODO_ID}`), routeContext(TODO_ID));

    expect(response.status).toBe(500);
  });
});

describe('PATCH /api/todos/[id]', () => {
  it('updates the todo and returns it', async () => {
    const updated = buildTodo({ title: 'Buy oat milk', isCompleted: true });
    mocks.updateTodo.mockResolvedValue(updated);

    const response = await PATCH(
      jsonRequest('PATCH', { title: 'Buy oat milk', isCompleted: true }, `/api/todos/${TODO_ID}`),
      routeContext(TODO_ID),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: toJsonTodo(updated) });
    expect(mocks.updateTodo).toHaveBeenCalledWith(TODO_ID, {
      title: 'Buy oat milk',
      isCompleted: true,
    });
  });

  it('returns 404 NOT_FOUND for an unknown todo', async () => {
    mocks.updateTodo.mockResolvedValue(undefined);

    const response = await PATCH(
      jsonRequest('PATCH', { isCompleted: true }, `/api/todos/${unknownId}`),
      routeContext(unknownId),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for an empty body', async () => {
    const response = await PATCH(
      jsonRequest('PATCH', {}, `/api/todos/${TODO_ID}`),
      routeContext(TODO_ID),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mocks.updateTodo).not.toHaveBeenCalled();
  });

  it('returns 400 for a wrong value type', async () => {
    const response = await PATCH(
      jsonRequest('PATCH', { isCompleted: 'yes' }, `/api/todos/${TODO_ID}`),
      routeContext(TODO_ID),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateTodo).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown key', async () => {
    const response = await PATCH(
      jsonRequest('PATCH', { id: unknownId }, `/api/todos/${TODO_ID}`),
      routeContext(TODO_ID),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateTodo).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed id', async () => {
    const response = await PATCH(
      jsonRequest('PATCH', { isCompleted: true }, `/api/todos/${malformedId}`),
      routeContext(malformedId),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateTodo).not.toHaveBeenCalled();
  });

  it('returns 500 INTERNAL_ERROR when the update fails', async () => {
    mocks.updateTodo.mockRejectedValue(new Error('deadlock detected'));

    const response = await PATCH(
      jsonRequest('PATCH', { isCompleted: true }, `/api/todos/${TODO_ID}`),
      routeContext(TODO_ID),
    );

    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/todos/[id]', () => {
  it('returns 204 with an empty body when the todo is removed', async () => {
    mocks.deleteTodo.mockResolvedValue(true);

    const response = await DELETE(
      plainRequest('DELETE', `/api/todos/${TODO_ID}`),
      routeContext(TODO_ID),
    );

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe('');
    expect(mocks.deleteTodo).toHaveBeenCalledWith(TODO_ID);
  });

  it('returns 404 NOT_FOUND when there is nothing to delete', async () => {
    mocks.deleteTodo.mockResolvedValue(false);

    const response = await DELETE(
      plainRequest('DELETE', `/api/todos/${unknownId}`),
      routeContext(unknownId),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed id', async () => {
    const response = await DELETE(
      plainRequest('DELETE', `/api/todos/${malformedId}`),
      routeContext(malformedId),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mocks.deleteTodo).not.toHaveBeenCalled();
  });

  it('returns 500 INTERNAL_ERROR when the delete fails', async () => {
    mocks.deleteTodo.mockRejectedValue(new Error('connection refused'));

    const response = await DELETE(
      plainRequest('DELETE', `/api/todos/${TODO_ID}`),
      routeContext(TODO_ID),
    );

    expect(response.status).toBe(500);
  });
});
