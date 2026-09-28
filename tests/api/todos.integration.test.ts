import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/todos/route';
import { DELETE, GET as GET_ONE, PATCH } from '@/app/api/todos/[id]/route';
import { GET as listNotesRoute, POST as createNoteRoute } from '@/app/api/todos/[id]/notes/route';
import {
  DELETE as deleteNoteRoute,
  PATCH as updateNoteRoute,
} from '@/app/api/todos/[id]/notes/[noteId]/route';
import { notes } from '@/db/schema';
import { hasTestDatabase } from '@/lib/env';
import { noteRouteContext } from '../helpers/notes';
import { jsonRequest, plainRequest, routeContext } from '../helpers/todos';
import { setupTestDb, type TestDb } from '../helpers/db';

/**
 * End-to-end coverage against a real PostgreSQL database (migrations are applied
 * by the helper). Skipped - not failed - when TEST_DATABASE_URL is not set, so
 * `npm test` still runs offline (see AGENTS.md -> Testing rules).
 */
const describeWithDatabase = hasTestDatabase() ? describe : describe.skip;

const unknownId = 'a1b2c3d4-0000-4000-8000-000000000000';

describeWithDatabase('todos API against PostgreSQL', () => {
  let testDb: TestDb | undefined;

  beforeAll(async () => {
    testDb = await setupTestDb();
  });

  afterAll(async () => {
    await testDb?.dispose();
  });

  beforeEach(async () => {
    await testDb?.truncate();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  /** Create a task through the API and return its id. */
  async function createTodoViaApi(title: string): Promise<string> {
    const response = await POST(jsonRequest('POST', { title }));
    const body = (await response.json()) as { data: { id: string } };
    return body.data.id;
  }

  it('creates a todo and returns it through both endpoints', async () => {
    const created = await POST(jsonRequest('POST', { title: 'Buy milk' }));
    const createdBody = (await created.json()) as { data: { id: string; title: string } };

    expect(created.status).toBe(201);
    expect(createdBody.data.title).toBe('Buy milk');

    const list = await GET();
    const listBody = (await list.json()) as { data: { title: string }[] };

    expect(list.status).toBe(200);
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0]?.title).toBe('Buy milk');

    const single = await GET_ONE(
      plainRequest('GET', `/api/todos/${createdBody.data.id}`),
      routeContext(createdBody.data.id),
    );

    expect(single.status).toBe(200);
  });

  it('rejects an invalid body without inserting anything', async () => {
    const response = await POST(jsonRequest('POST', { title: '   ' }));

    expect(response.status).toBe(400);
    const list = await GET();
    await expect(list.json()).resolves.toEqual({ data: [] });
  });

  it('updates a todo and reports 404 for unknown ids', async () => {
    const created = await POST(jsonRequest('POST', { title: 'Buy milk' }));
    const createdBody = (await created.json()) as { data: { id: string } };

    const patched = await PATCH(
      jsonRequest(
        'PATCH',
        { isCompleted: true, title: 'Buy oat milk' },
        `/api/todos/${createdBody.data.id}`,
      ),
      routeContext(createdBody.data.id),
    );
    const patchedBody = (await patched.json()) as {
      data: { title: string; isCompleted: boolean };
    };

    expect(patched.status).toBe(200);
    expect(patchedBody.data).toEqual(
      expect.objectContaining({ title: 'Buy oat milk', isCompleted: true }),
    );

    const missing = await GET_ONE(
      plainRequest('GET', `/api/todos/${unknownId}`),
      routeContext(unknownId),
    );

    expect(missing.status).toBe(404);

    const missingPatch = await PATCH(
      jsonRequest('PATCH', { isCompleted: false }, `/api/todos/${unknownId}`),
      routeContext(unknownId),
    );

    expect(missingPatch.status).toBe(404);
  });

  it('deletes a todo, then reports it as gone', async () => {
    const created = await POST(jsonRequest('POST', { title: 'Buy milk' }));
    const createdBody = (await created.json()) as { data: { id: string } };

    const deleted = await DELETE(
      plainRequest('DELETE', `/api/todos/${createdBody.data.id}`),
      routeContext(createdBody.data.id),
    );

    expect(deleted.status).toBe(204);

    const gone = await GET_ONE(
      plainRequest('GET', `/api/todos/${createdBody.data.id}`),
      routeContext(createdBody.data.id),
    );

    expect(gone.status).toBe(404);

    const deletedAgain = await DELETE(
      plainRequest('DELETE', `/api/todos/${createdBody.data.id}`),
      routeContext(createdBody.data.id),
    );

    expect(deletedAgain.status).toBe(404);
  });

  it('adds, lists, edits and deletes notes on a task', async () => {
    const todoId = await createTodoViaApi('Plan the trip');
    const notesPath = `/api/todos/${todoId}/notes`;

    const added = await createNoteRoute(
      jsonRequest('POST', { body: 'Book the ferry' }, notesPath),
      routeContext(todoId),
    );
    const addedBody = (await added.json()) as { data: { id: string; body: string } };

    expect(added.status).toBe(201);
    expect(addedBody.data.body).toBe('Book the ferry');

    const listed = await listNotesRoute(plainRequest('GET', notesPath), routeContext(todoId));
    const listedBody = (await listed.json()) as { data: { body: string }[] };

    expect(listed.status).toBe(200);
    expect(listedBody.data.map((note) => note.body)).toEqual(['Book the ferry']);

    const noteId = addedBody.data.id;
    const edited = await updateNoteRoute(
      jsonRequest('PATCH', { body: 'Book the ferry and the train' }, `${notesPath}/${noteId}`),
      noteRouteContext(todoId, noteId),
    );
    const editedBody = (await edited.json()) as { data: { body: string } };

    expect(edited.status).toBe(200);
    expect(editedBody.data.body).toBe('Book the ferry and the train');

    const removed = await deleteNoteRoute(
      plainRequest('DELETE', `${notesPath}/${noteId}`),
      noteRouteContext(todoId, noteId),
    );
    expect(removed.status).toBe(204);

    const removedAgain = await deleteNoteRoute(
      plainRequest('DELETE', `${notesPath}/${noteId}`),
      noteRouteContext(todoId, noteId),
    );
    expect(removedAgain.status).toBe(404);
  });

  it('refuses to add a note to a task that does not exist', async () => {
    const response = await createNoteRoute(
      jsonRequest('POST', { body: 'Orphan note' }, `/api/todos/${unknownId}/notes`),
      routeContext(unknownId),
    );

    expect(response.status).toBe(404);
  });

  it('deletes a task together with its notes', async () => {
    const todoId = await createTodoViaApi('Delete me');
    const notesPath = `/api/todos/${todoId}/notes`;

    await createNoteRoute(
      jsonRequest('POST', { body: 'Goes away with the task' }, notesPath),
      routeContext(todoId),
    );

    // The note really is in the table before the task is deleted.
    const before = await testDb?.db.select().from(notes).where(eq(notes.todoId, todoId));
    expect(before).toHaveLength(1);

    const deleted = await DELETE(
      plainRequest('DELETE', `/api/todos/${todoId}`),
      routeContext(todoId),
    );
    expect(deleted.status).toBe(204);

    // `on delete cascade` removes the note, so no orphan rows are left behind.
    const after = await testDb?.db.select().from(notes).where(eq(notes.todoId, todoId));
    expect(after).toHaveLength(0);
  });

  it("keeps one task from reaching another task's notes", async () => {
    const firstId = await createTodoViaApi('First task');
    const secondId = await createTodoViaApi('Second task');

    const added = await createNoteRoute(
      jsonRequest('POST', { body: 'Belongs to the first task' }, `/api/todos/${firstId}/notes`),
      routeContext(firstId),
    );
    const noteId = ((await added.json()) as { data: { id: string } }).data.id;

    // Same note id, wrong parent: the request must not touch the note.
    const crossed = await updateNoteRoute(
      jsonRequest('PATCH', { body: 'Hijacked' }, `/api/todos/${secondId}/notes/${noteId}`),
      noteRouteContext(secondId, noteId),
    );
    expect(crossed.status).toBe(404);

    const crossedDelete = await deleteNoteRoute(
      plainRequest('DELETE', `/api/todos/${secondId}/notes/${noteId}`),
      noteRouteContext(secondId, noteId),
    );
    expect(crossedDelete.status).toBe(404);

    const stillThere = await testDb?.db.select().from(notes).where(eq(notes.id, noteId));
    expect(stillThere).toHaveLength(1);
  });
});
