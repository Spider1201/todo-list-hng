import type { ZodError } from 'zod';

/** Stable, machine-readable error codes returned in the JSON error envelope. */
export type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

/** `200` with `{ data }` - the success envelope for a single resource or a list. */
export function jsonOk<T>(data: T, init: ResponseInit = {}): Response {
  return Response.json({ data }, { ...init, status: init.status ?? 200 });
}

/** `201` with `{ data }` and a `Location` header pointing at the new resource. */
export function jsonCreated<T>(data: T, location: string): Response {
  return Response.json({ data }, { status: 201, headers: { location } });
}

/** `204` with an empty body (used by DELETE). */
export function jsonNoContent(): Response {
  return new Response(null, { status: 204 });
}

/** `{ error: { code, message, details? } }` with any status code. */
export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): Response {
  const body: ApiErrorBody = {
    error: details === undefined ? { code, message } : { code, message, details },
  };
  return Response.json(body, { status });
}

/** `400` carrying the zod issues so clients can point at the offending field. */
export function validationError(error: ZodError): Response {
  return jsonError(400, 'VALIDATION_ERROR', 'The request failed validation.', error.issues);
}

/** `404` for a resource that does not exist. */
export function notFoundError(message = 'No todo exists with that id.'): Response {
  return jsonError(404, 'NOT_FOUND', message);
}

/**
 * `500` for unexpected failures. The real error is logged server-side only -
 * never leak SQL text or stack traces to the client (see AGENTS.md -> API conventions).
 */
export function internalError(error: unknown, message = 'Something went wrong.'): Response {
  console.error('[api] unexpected error', error);
  return jsonError(500, 'INTERNAL_ERROR', message);
}

/**
 * Read a JSON request body. Malformed or empty JSON resolves to `undefined` so
 * the caller's zod schema reports it as a `400` validation error.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
