'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { NotesPanel } from '@/components/NotesPanel';
import type { Note, Todo } from '@/db/schema';
import { TITLE_MAX_LENGTH } from '@/lib/validators/todo';

// A fixed time zone keeps the server and client markup identical (no hydration drift).
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export interface TodoItemProps {
  todo: Todo;
  /** True while a request for this row is in flight. */
  busy: boolean;
  /** The task's notes, loaded by the Server Component. */
  notes: Note[];
  /** True when this row's notes panel is expanded. */
  notesOpen: boolean;
  onToggle: (todo: Todo) => Promise<boolean>;
  onRename: (todo: Todo, title: string) => Promise<boolean>;
  onDelete: (todo: Todo) => Promise<boolean>;
  onToggleNotes: (todo: Todo) => void;
  /** Called after a note changes so the Server Component re-reads the database. */
  onNotesChanged: () => void;
}

/**
 * One task row: complete, rename inline, delete (with confirmation), and expand
 * its notes. Local UI state lives here; the API calls and their error messages
 * belong to `TodoList` (tasks) and `NotesPanel` (notes).
 */
export function TodoItem({
  todo,
  busy,
  notes,
  notesOpen,
  onToggle,
  onRename,
  onDelete,
  onToggleNotes,
  onNotesChanged,
}: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Move focus into the field as soon as the row switches into edit mode.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing(): void {
    setDraft(todo.title);
    setError(undefined);
    setEditing(true);
  }

  function stopEditing(): void {
    setDraft(todo.title);
    setError(undefined);
    setEditing(false);
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setError('A task needs a title.');
      return;
    }
    if (trimmed === todo.title) {
      stopEditing();
      return;
    }

    if (await onRename(todo, trimmed)) {
      stopEditing();
    }
  }

  async function confirmDelete(): Promise<void> {
    if (await onDelete(todo)) {
      setConfirmingDelete(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      stopEditing();
    }
  }

  const rowClass = `todo${todo.isCompleted ? ' todo--done' : ''}${busy ? ' todo--busy' : ''}`;

  return (
    <li aria-busy={busy} className={rowClass}>
      <input
        aria-label={todo.isCompleted ? `Reopen ${todo.title}` : `Complete ${todo.title}`}
        checked={todo.isCompleted}
        className="todo__checkbox"
        disabled={busy || editing}
        onChange={() => void onToggle(todo)}
        type="checkbox"
      />

      {editing ? (
        <form className="todo-edit" onSubmit={(event) => void save(event)}>
          <label className="sr-only" htmlFor={`edit-${todo.id}`}>
            Task title
          </label>
          <input
            autoComplete="off"
            className="input"
            disabled={busy}
            id={`edit-${todo.id}`}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            value={draft}
          />
          <div className="todo__actions">
            <button className="button button--primary" disabled={busy} type="submit">
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button className="button" disabled={busy} onClick={stopEditing} type="button">
              Cancel
            </button>
          </div>
          {error === undefined ? null : (
            <p className="notice notice--error todo__error" role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <>
          <div className="todo__body">
            <p className="todo__title">{todo.title}</p>
            <p className="todo__meta">Added {dateFormatter.format(todo.createdAt)}</p>
          </div>

          <div className="todo__actions">
            {confirmingDelete ? (
              <>
                <span className="todo__confirm">Delete this task?</span>
                <button
                  className="button button--danger"
                  disabled={busy}
                  onClick={() => void confirmDelete()}
                  type="button"
                >
                  Yes, delete
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => setConfirmingDelete(false)}
                  type="button"
                >
                  Keep it
                </button>
              </>
            ) : (
              <>
                <button
                  aria-expanded={notesOpen}
                  className="button"
                  disabled={busy}
                  onClick={() => onToggleNotes(todo)}
                  type="button"
                >
                  {notesOpen ? 'Hide notes' : `Notes (${notes.length})`}
                </button>
                <button className="button" disabled={busy} onClick={startEditing} type="button">
                  Edit
                </button>
                <button
                  className="button button--ghost"
                  disabled={busy}
                  onClick={() => setConfirmingDelete(true)}
                  type="button"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}

      {notesOpen ? <NotesPanel notes={notes} onChanged={onNotesChanged} todo={todo} /> : null}

      <span aria-live="polite" className="sr-only">
        {busy ? 'Saving…' : ''}
      </span>
    </li>
  );
}
