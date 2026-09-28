import { describe, expect, it } from 'vitest';

import {
  NOTE_MAX_LENGTH,
  createNoteSchema,
  noteIdSchema,
  updateNoteSchema,
} from '@/lib/validators/note';
import { NOTE_ID } from '../../helpers/notes';

describe('noteIdSchema', () => {
  it('accepts a UUID', () => {
    const result = noteIdSchema.safeParse(NOTE_ID);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe(NOTE_ID);
  });

  const invalidIds: unknown[] = ['not-a-uuid', '', 42, null, undefined, { id: NOTE_ID }];

  invalidIds.forEach((id) => {
    it(`rejects ${JSON.stringify(id) ?? String(id)}`, () => {
      expect(noteIdSchema.safeParse(id).success).toBe(false);
    });
  });
});

describe('createNoteSchema', () => {
  it('trims the body', () => {
    const result = createNoteSchema.safeParse({ body: '  Remember the milk  ' });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ body: 'Remember the milk' });
  });

  it('keeps internal newlines so multi-line notes survive', () => {
    const result = createNoteSchema.safeParse({ body: 'line one\nline two' });

    expect(result.success && result.data).toEqual({ body: 'line one\nline two' });
  });

  it('accepts a body at the maximum length', () => {
    expect(createNoteSchema.safeParse({ body: 'a'.repeat(NOTE_MAX_LENGTH) }).success).toBe(true);
  });

  const invalidBodies: [name: string, body: unknown][] = [
    ['a missing body', {}],
    ['an empty body', { body: '' }],
    ['a whitespace-only body', { body: '   ' }],
    ['a non-string body', { body: 42 }],
    ['a body over the limit', { body: 'a'.repeat(NOTE_MAX_LENGTH + 1) }],
    ['an unknown key', { body: 'Remember milk', todoId: NOTE_ID }],
    ['a JSON null body', null],
  ];

  invalidBodies.forEach(([name, body]) => {
    it(`rejects ${name}`, () => {
      expect(createNoteSchema.safeParse(body).success).toBe(false);
    });
  });
});

describe('updateNoteSchema', () => {
  it('accepts a new body', () => {
    const result = updateNoteSchema.safeParse({ body: 'Buy oat milk' });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ body: 'Buy oat milk' });
  });

  const invalidBodies: [name: string, body: unknown][] = [
    ['an empty object', {}],
    ['an empty body', { body: '' }],
    ['a whitespace-only body', { body: '  ' }],
    ['an unknown key', { id: NOTE_ID }],
    ['a non-object body', 'nope'],
  ];

  invalidBodies.forEach(([name, body]) => {
    it(`rejects ${name}`, () => {
      expect(updateNoteSchema.safeParse(body).success).toBe(false);
    });
  });
});
