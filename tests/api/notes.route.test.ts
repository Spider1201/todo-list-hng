import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/todos/[id]/notes/route';
import { OTHER_NOTE_ID, buildNote, toJsonNote, type JsonNote } from '../helpers/notes';
import { TODO_ID, buildTodo, jsonRequest, plainRequest, routeContext } from '../helpers/todos';

const mocks = vi.hoisted(() => ({
  findTodoById: vi.fn(),
  listNotes: vi.fn(),
  createNote: vi.fn(),
}));

vi.mock('@/lib/todos', () => ({
  findTodoById: mocks.findTodoById,
}));

vi.mock('@/lib/notes', () => ({
  listNotes: mocks.listNotes,
  createNote: mocks.createNote,
}));

interface ListBody {
  data: JsonNote[];
}

interface ErrorBody {
  error: { code: string; message: string; details?: { path: (string | number)[] }[] };
}

const unknownId = 'a1b2c3d4-0000-4000-8000-000000000000';
const malformedId = 'not-a-uuid';
const notesPath = (id: string): string => `/api/todos/${id}/notes`;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocks.findTodoById.mockResolvedValue(buildTodo());
});

describe('GET /api/todos/[id]/notes', () => {
  it('returns the notes of the task with status 200', async () => {
    const notes = [buildNote(), buildNote({ id: OTHER_NOTE_ID, body: 'Second note' })];
    mocks.listNotes.mockResolvedValue(notes);

    const response = await GET(plainRequest('GET', notesPath(TODO_ID)), routeContext(TODO_ID));
    const body = (await response.json()) as ListBody;

    expect(response.status).toBe(200);
    expect(body.data).toEqual(notes.map(toJsonNote));
    expect(mocks.listNotes).toHaveBeenCalledWith(TODO_ID);
  });

  it('returns an empty list when the task has no notes', async () => {
    mocks.listNotes.mockResolvedValue([]);

    const response = await GET(plainRequest('GET', notesPath(TODO_ID)), routeContext(TODO_ID));

    await expect(response.json()).resolves.toEqual({ data: [] });
  });

  it('returns 404 NOT_FOUND when the task does not exist', async () => {
    mocks.findTodoById.mockResolvedValue(undefined);

    const response = await GET(plainRequest('GET', notesPath(unknownId)), routeContext(unknownId));
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(mocks.listNotes).not.toHaveBeenCalled();
  });

  it('returns 400 for a task id that is not a UUID', async () => {
    const response = await GET(
      plainRequest('GET', notesPath(malformedId)),
      routeContext(malformedId),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mocks.findTodoById).not.toHaveBeenCalled();
  });

  it('returns 500 INTERNAL_ERROR when the note lookup fails', async () => {
    mocks.listNotes.mockRejectedValue(new Error('connection refused'));

    const response = await GET(plainRequest('GET', notesPath(TODO_ID)), routeContext(TODO_ID));

    expect(response.status).toBe(500);
  });
});

describe('POST /api/todos/[id]/notes', () => {
  it('creates a note and returns 201 with a Location header', async () => {
    const note = buildNote({ body: 'Remember the oat milk' });
    mocks.createNote.mockResolvedValue(note);

    const response = await POST(
      jsonRequest('POST', { body: 'Remember the oat milk' }, notesPath(TODO_ID)),
      routeContext(TODO_ID),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(`/api/todos/${TODO_ID}/notes/${note.id}`);
    await expect(response.json()).resolves.toEqual({ data: toJsonNote(note) });
    expect(mocks.createNote).toHaveBeenCalledWith(TODO_ID, { body: 'Remember the oat milk' });
  });

  it('trims the body before it reaches the data layer', async () => {
    mocks.createNote.mockResolvedValue(buildNote());

    await POST(
      jsonRequest('POST', { body: '   Remember the milk   ' }, notesPath(TODO_ID)),
      routeContext(TODO_ID),
    );

    expect(mocks.createNote).toHaveBeenCalledWith(TODO_ID, { body: 'Remember the milk' });
  });

  it('returns 404 and does not insert when the task does not exist', async () => {
    mocks.findTodoById.mockResolvedValue(undefined);

    const response = await POST(
      jsonRequest('POST', { body: 'Orphan note' }, notesPath(unknownId)),
      routeContext(unknownId),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(mocks.createNote).not.toHaveBeenCalled();
  });

  it('returns 400 without calling the data layer when the body is missing', async () => {
    const response = await POST(jsonRequest('POST', {}, notesPath(TODO_ID)), routeContext(TODO_ID));
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.[0]?.path).toEqual(['body']);
    expect(mocks.createNote).not.toHaveBeenCalled();
  });

  it('returns 400 for a whitespace-only body', async () => {
    const response = await POST(
      jsonRequest('POST', { body: '   ' }, notesPath(TODO_ID)),
      routeContext(TODO_ID),
    );

    expect(response.status).toBe(400);
    expect(mocks.createNote).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown key', async () => {
    const response = await POST(
      jsonRequest('POST', { body: 'Remember milk', todoId: TODO_ID }, notesPath(TODO_ID)),
      routeContext(TODO_ID),
    );

    expect(response.status).toBe(400);
    expect(mocks.createNote).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(
      jsonRequest('POST', '{ not json', notesPath(TODO_ID)),
      routeContext(TODO_ID),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mocks.createNote).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed task id', async () => {
    const response = await POST(
      jsonRequest('POST', { body: 'Remember milk' }, notesPath(malformedId)),
      routeContext(malformedId),
    );

    expect(response.status).toBe(400);
    expect(mocks.createNote).not.toHaveBeenCalled();
  });

  it('returns 500 INTERNAL_ERROR when the insert fails', async () => {
    mocks.createNote.mockRejectedValue(new Error('foreign key violation'));

    const response = await POST(
      jsonRequest('POST', { body: 'Remember milk' }, notesPath(TODO_ID)),
      routeContext(TODO_ID),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
