import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, PATCH } from '@/app/api/todos/[id]/notes/[noteId]/route';
import { NOTE_ID, buildNote, noteRouteContext, toJsonNote } from '../helpers/notes';
import { TODO_ID, jsonRequest, plainRequest } from '../helpers/todos';

const mocks = vi.hoisted(() => ({
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock('@/lib/notes', () => ({
  updateNote: mocks.updateNote,
  deleteNote: mocks.deleteNote,
}));

interface ErrorBody {
  error: { code: string; message: string; details?: { path: (string | number)[] }[] };
}

const unknownNoteId = 'd0e2a4c6-1111-4222-8333-444455556666';
const malformedId = 'not-a-uuid';
const notesPath = (todoId: string, noteId: string): string =>
  `/api/todos/${todoId}/notes/${noteId}`;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('PATCH /api/todos/[id]/notes/[noteId]', () => {
  it('replaces the note body and returns the updated note', async () => {
    const updated = buildNote({ body: 'Buy oat milk' });
    mocks.updateNote.mockResolvedValue(updated);

    const response = await PATCH(
      jsonRequest('PATCH', { body: 'Buy oat milk' }, notesPath(TODO_ID, NOTE_ID)),
      noteRouteContext(TODO_ID, NOTE_ID),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: toJsonNote(updated) });
    // Both ids are passed on, so a note can never be edited through another task.
    expect(mocks.updateNote).toHaveBeenCalledWith(TODO_ID, NOTE_ID, { body: 'Buy oat milk' });
  });

  it('trims the body before it reaches the data layer', async () => {
    mocks.updateNote.mockResolvedValue(buildNote());

    await PATCH(
      jsonRequest('PATCH', { body: '  Buy oat milk  ' }, notesPath(TODO_ID, NOTE_ID)),
      noteRouteContext(TODO_ID, NOTE_ID),
    );

    expect(mocks.updateNote).toHaveBeenCalledWith(TODO_ID, NOTE_ID, { body: 'Buy oat milk' });
  });

  it('returns 404 NOT_FOUND when the note does not exist on this task', async () => {
    mocks.updateNote.mockResolvedValue(undefined);

    const response = await PATCH(
      jsonRequest('PATCH', { body: 'Buy oat milk' }, notesPath(TODO_ID, unknownNoteId)),
      noteRouteContext(TODO_ID, unknownNoteId),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for an empty body', async () => {
    const response = await PATCH(
      jsonRequest('PATCH', {}, notesPath(TODO_ID, NOTE_ID)),
      noteRouteContext(TODO_ID, NOTE_ID),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mocks.updateNote).not.toHaveBeenCalled();
  });

  it('returns 400 for a whitespace-only body', async () => {
    const response = await PATCH(
      jsonRequest('PATCH', { body: '   ' }, notesPath(TODO_ID, NOTE_ID)),
      noteRouteContext(TODO_ID, NOTE_ID),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateNote).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown key', async () => {
    const response = await PATCH(
      jsonRequest('PATCH', { body: 'Buy oat milk', id: NOTE_ID }, notesPath(TODO_ID, NOTE_ID)),
      noteRouteContext(TODO_ID, NOTE_ID),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateNote).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed note id', async () => {
    const response = await PATCH(
      jsonRequest('PATCH', { body: 'Buy oat milk' }, notesPath(TODO_ID, malformedId)),
      noteRouteContext(TODO_ID, malformedId),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateNote).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed task id', async () => {
    const response = await PATCH(
      jsonRequest('PATCH', { body: 'Buy oat milk' }, notesPath(malformedId, NOTE_ID)),
      noteRouteContext(malformedId, NOTE_ID),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateNote).not.toHaveBeenCalled();
  });

  it('returns 500 INTERNAL_ERROR when the update fails', async () => {
    mocks.updateNote.mockRejectedValue(new Error('deadlock detected'));

    const response = await PATCH(
      jsonRequest('PATCH', { body: 'Buy oat milk' }, notesPath(TODO_ID, NOTE_ID)),
      noteRouteContext(TODO_ID, NOTE_ID),
    );

    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/todos/[id]/notes/[noteId]', () => {
  it('returns 204 with an empty body when the note is removed', async () => {
    mocks.deleteNote.mockResolvedValue(true);

    const response = await DELETE(
      plainRequest('DELETE', notesPath(TODO_ID, NOTE_ID)),
      noteRouteContext(TODO_ID, NOTE_ID),
    );

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe('');
    expect(mocks.deleteNote).toHaveBeenCalledWith(TODO_ID, NOTE_ID);
  });

  it('returns 404 NOT_FOUND when there is nothing to delete', async () => {
    mocks.deleteNote.mockResolvedValue(false);

    const response = await DELETE(
      plainRequest('DELETE', notesPath(TODO_ID, unknownNoteId)),
      noteRouteContext(TODO_ID, unknownNoteId),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed note id', async () => {
    const response = await DELETE(
      plainRequest('DELETE', notesPath(TODO_ID, malformedId)),
      noteRouteContext(TODO_ID, malformedId),
    );
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mocks.deleteNote).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed task id', async () => {
    const response = await DELETE(
      plainRequest('DELETE', notesPath(malformedId, NOTE_ID)),
      noteRouteContext(malformedId, NOTE_ID),
    );

    expect(response.status).toBe(400);
    expect(mocks.deleteNote).not.toHaveBeenCalled();
  });

  it('returns 500 INTERNAL_ERROR when the delete fails', async () => {
    mocks.deleteNote.mockRejectedValue(new Error('connection refused'));

    const response = await DELETE(
      plainRequest('DELETE', notesPath(TODO_ID, NOTE_ID)),
      noteRouteContext(TODO_ID, NOTE_ID),
    );

    expect(response.status).toBe(500);
  });
});
