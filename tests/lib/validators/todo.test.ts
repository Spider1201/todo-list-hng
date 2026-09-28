import { describe, expect, it } from 'vitest';

import {
  TITLE_MAX_LENGTH,
  createTodoSchema,
  todoIdSchema,
  updateTodoSchema,
} from '@/lib/validators/todo';
import { TODO_ID } from '../../helpers/todos';

describe('todoIdSchema', () => {
  it('accepts a UUID', () => {
    const result = todoIdSchema.safeParse(TODO_ID);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe(TODO_ID);
  });

  const invalidIds: unknown[] = ['not-a-uuid', '', 42, null, undefined, { id: TODO_ID }];

  invalidIds.forEach((id) => {
    it(`rejects ${JSON.stringify(id) ?? String(id)}`, () => {
      expect(todoIdSchema.safeParse(id).success).toBe(false);
    });
  });
});

describe('createTodoSchema', () => {
  it('trims the title', () => {
    const result = createTodoSchema.safeParse({ title: '  Buy milk  ' });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ title: 'Buy milk' });
  });

  it('accepts a title at the maximum length', () => {
    const title = 'a'.repeat(TITLE_MAX_LENGTH);
    expect(createTodoSchema.safeParse({ title }).success).toBe(true);
  });

  const invalidBodies: [name: string, body: unknown][] = [
    ['a missing title', {}],
    ['an empty title', { title: '' }],
    ['a whitespace-only title', { title: '   ' }],
    ['a non-string title', { title: 42 }],
    ['a title over the limit', { title: 'a'.repeat(TITLE_MAX_LENGTH + 1) }],
    ['an unknown key', { title: 'Buy milk', isCompleted: true }],
    ['a JSON null body', null],
  ];

  invalidBodies.forEach(([name, body]) => {
    it(`rejects ${name}`, () => {
      expect(createTodoSchema.safeParse(body).success).toBe(false);
    });
  });
});

describe('updateTodoSchema', () => {
  it('accepts a title-only update', () => {
    const result = updateTodoSchema.safeParse({ title: 'Buy oat milk' });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ title: 'Buy oat milk' });
  });

  it('accepts a completion-only update', () => {
    const result = updateTodoSchema.safeParse({ isCompleted: true });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ isCompleted: true });
  });

  const invalidBodies: [name: string, body: unknown][] = [
    ['an empty body', {}],
    ['an empty title', { title: '' }],
    ['a non-boolean isCompleted', { isCompleted: 'yes' }],
    ['an unknown key', { id: TODO_ID }],
    ['a non-object body', 'nope'],
  ];

  invalidBodies.forEach(([name, body]) => {
    it(`rejects ${name}`, () => {
      expect(updateTodoSchema.safeParse(body).success).toBe(false);
    });
  });
});
