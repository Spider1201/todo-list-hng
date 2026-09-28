import { afterEach, describe, expect, it, vi } from 'vitest';

import { jsonBody, requestJson } from '@/lib/api-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stubFetch(implementation: (input: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestJson', () => {
  it('returns the parsed data payload on success', async () => {
    stubFetch(async () => jsonResponse({ data: { id: 'abc' } }));

    const result = await requestJson<{ id: string }>('/api/todos/abc');

    expect(result).toEqual({ ok: true, data: { id: 'abc' } });
  });

  it('returns undefined data for a 204 response', async () => {
    stubFetch(async () => new Response(null, { status: 204 }));

    const result = await requestJson('/api/todos/abc', { method: 'DELETE' });

    expect(result).toEqual({ ok: true, data: undefined });
  });

  it('returns undefined data when a success body is not the expected envelope', async () => {
    stubFetch(async () => jsonResponse({ unexpected: true }));

    const result = await requestJson('/api/todos');

    expect(result).toEqual({ ok: true, data: undefined });
  });

  it('passes the request straight through to fetch', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ data: [] }));

    await requestJson('/api/todos', { method: 'POST', ...jsonBody({ title: 'Buy milk' }) });

    expect(fetchMock).toHaveBeenCalledWith('/api/todos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Buy milk' }),
    });
  });

  it('surfaces the message from the API error envelope', async () => {
    stubFetch(async () =>
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'No todo exists with that id.' } }, 404),
    );

    const result = await requestJson('/api/todos/3f1b0d24-9c4a-4a5e-8f2d-1c6b7a8d9e0f');

    expect(result).toEqual({ ok: false, message: 'No todo exists with that id.' });
  });

  it('explains a 400 that has no envelope', async () => {
    stubFetch(async () => new Response('nope', { status: 400 }));

    const result = await requestJson('/api/todos');

    if (result.ok) {
      throw new Error('Expected the request to fail.');
    }
    expect(result.message).toContain('rejected');
  });

  it('explains a 500 that has no envelope', async () => {
    stubFetch(async () => new Response('<html>boom</html>', { status: 500 }));

    const result = await requestJson('/api/todos');

    if (result.ok) {
      throw new Error('Expected the request to fail.');
    }
    expect(result.message).toContain('server ran into a problem');
  });

  it('reports a network failure when fetch rejects', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    const result = await requestJson('/api/todos');

    if (result.ok) {
      throw new Error('Expected the request to fail.');
    }
    expect(result.message).toContain('could not reach the server');
  });
});

describe('jsonBody', () => {
  it('serialises the payload with a JSON content type', () => {
    expect(jsonBody({ title: 'Buy milk' })).toEqual({
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Buy milk' }),
    });
  });
});
