import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  internalError,
  jsonCreated,
  jsonError,
  jsonNoContent,
  jsonOk,
  readJsonBody,
  validationError,
} from '@/lib/http';

describe('jsonOk', () => {
  it('wraps the payload in `data` with status 200', async () => {
    const response = jsonOk([{ id: 'a' }]);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [{ id: 'a' }] });
  });

  it('allows overriding the status and headers', async () => {
    const response = jsonOk({ id: 'a' }, { status: 202, headers: { 'x-test': 'yes' } });

    expect(response.status).toBe(202);
    expect(response.headers.get('x-test')).toBe('yes');
  });
});

describe('jsonCreated', () => {
  it('returns 201 with a Location header', async () => {
    const response = jsonCreated({ id: 'a' }, '/api/todos/a');

    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe('/api/todos/a');
    await expect(response.json()).resolves.toEqual({ data: { id: 'a' } });
  });
});

describe('jsonNoContent', () => {
  it('returns 204 with an empty body', async () => {
    const response = jsonNoContent();

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe('');
  });
});

describe('jsonError', () => {
  it('returns the error envelope without details', async () => {
    const response = jsonError(404, 'NOT_FOUND', 'Nope.');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'NOT_FOUND', message: 'Nope.' },
    });
  });

  it('includes details when provided', async () => {
    const response = jsonError(400, 'VALIDATION_ERROR', 'Bad input.', [{ path: ['title'] }]);

    await expect(response.json()).resolves.toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Bad input.', details: [{ path: ['title'] }] },
    });
  });
});

describe('validationError', () => {
  it('returns 400 with the zod issues', async () => {
    const parsed = z.strictObject({ title: z.string() }).safeParse({});
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error('Expected the schema to reject the payload.');
    }

    const response = validationError(parsed.error);
    const body = (await response.json()) as {
      error: { code: string; details: { path: (string | number)[] }[] };
    };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0]?.path).toEqual(['title']);
  });
});

describe('internalError', () => {
  it('logs the cause and returns a 500 envelope without leaking it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const cause = new Error('connection refused: postgres://user:pw@host/db');

    const response = internalError(cause, 'Failed to load todos.');
    const raw = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(raw).toContain('INTERNAL_ERROR');
    expect(raw).not.toContain('postgres://');
    expect(spy).toHaveBeenCalledWith('[api] unexpected error', cause);
  });

  it('uses a generic message by default', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = internalError(new Error('boom'));

    await expect(response.json()).resolves.toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
    });
  });
});

describe('readJsonBody', () => {
  it('parses a JSON body', async () => {
    const request = new Request('http://localhost/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title: 'Buy milk' }),
    });

    await expect(readJsonBody(request)).resolves.toEqual({ title: 'Buy milk' });
  });

  it('resolves to undefined for malformed JSON', async () => {
    const request = new Request('http://localhost/api/todos', {
      method: 'POST',
      body: '{ not json',
    });

    await expect(readJsonBody(request)).resolves.toBeUndefined();
  });

  it('resolves to undefined when there is no body', async () => {
    const request = new Request('http://localhost/api/todos', { method: 'POST' });

    await expect(readJsonBody(request)).resolves.toBeUndefined();
  });
});
