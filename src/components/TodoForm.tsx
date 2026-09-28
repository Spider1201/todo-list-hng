'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { Todo } from '@/db/schema';
import { jsonBody, requestJson } from '@/lib/api-client';
import { TITLE_MAX_LENGTH } from '@/lib/validators/todo';

/** Creates a task through `POST /api/todos`. */
export function TodoForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setError('Give the task a title first.');
      return;
    }

    setPending(true);
    setError(undefined);

    const result = await requestJson<Todo>('/api/todos', {
      method: 'POST',
      ...jsonBody({ title: trimmed }),
    });

    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setTitle('');
    router.refresh();
  }

  return (
    <form
      aria-busy={pending}
      className="card todo-form"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <label className="sr-only" htmlFor="new-todo">
        Task title
      </label>
      <input
        autoComplete="off"
        className="input"
        disabled={pending}
        id="new-todo"
        maxLength={TITLE_MAX_LENGTH}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="What needs doing?"
        value={title}
      />
      <button className="button button--primary" disabled={pending} type="submit">
        {pending ? 'Adding…' : 'Add task'}
      </button>
      {error === undefined ? null : (
        <p className="notice notice--error todo-form__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
