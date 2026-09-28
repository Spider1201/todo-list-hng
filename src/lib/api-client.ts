import { z } from 'zod';

/**
 * Thin browser-side client for our JSON API. Every response is checked with zod
 * and every failure is turned into a message a human can read, so components
 * never parse the error envelope themselves (see AGENTS.md -> API conventions).
 */

/** Success envelope used by every route: `{ "data": ... }`. */
const successBodySchema = z.object({ data: z.unknown() });

/** Failure envelope used by every route. */
const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiResult<T> = { ok: true; data: T | undefined } | { ok: false; message: string };

const NETWORK_ERROR_MESSAGE = 'We could not reach the server. Check your connection and try again.';
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** Readable message for statuses the API did not describe with an envelope. */
function fallbackMessageForStatus(status: number): string {
  if (status === 400) {
    return 'That request was rejected. Check the value and try again.';
  }
  if (status === 404) {
    return 'That task no longer exists.';
  }
  if (status >= 500) {
    return 'The server ran into a problem. Please try again.';
  }
  return GENERIC_ERROR_MESSAGE;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Send a request and return either the parsed `data` payload or a readable error
 * message. Never throws, so callers always have something to render.
 */
export async function requestJson<T = unknown>(
  input: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE };
  }

  if (!response.ok) {
    const parsed = errorBodySchema.safeParse(await readJson(response));
    return {
      ok: false,
      message: parsed.success
        ? parsed.data.error.message
        : fallbackMessageForStatus(response.status),
    };
  }

  // `204 No Content` (DELETE) has no body to parse.
  if (response.status === 204) {
    return { ok: true, data: undefined };
  }

  const parsed = successBodySchema.safeParse(await readJson(response));
  return { ok: true, data: parsed.success ? (parsed.data.data as T) : undefined };
}

/** JSON request body for the API's zod-validated endpoints. */
export function jsonBody(value: unknown): Pick<RequestInit, 'headers' | 'body'> {
  return {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  };
}
