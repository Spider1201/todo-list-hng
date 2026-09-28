'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import type { Note, Todo } from '@/db/schema';
import { jsonBody, requestJson } from '@/lib/api-client';
import { NOTE_MAX_LENGTH } from '@/lib/validators/note';

// Same fixed time zone as the task rows, so server and client markup agree.
const timestampFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

export interface NotesPanelProps {
  todo: Todo;
  notes: Note[];
  /** Called after a note changes so the Server Component re-reads the database. */
  onChanged: () => void;
}

/**
 * The notes of one task: list, add, edit inline, delete. Notes are already loaded
 * by the Server Component, so this panel never fetches on render - it only calls
 * the notes API for mutations.
 */
export function NotesPanel({ todo, notes, onChanged }: NotesPanelProps) {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editDraft, setEditDraft] = useState('');
  const [busyId, setBusyId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Move focus into the field as soon as a note switches into edit mode.
  useEffect(() => {
    if (editingId !== undefined) {
      editRef.current?.focus();
    }
  }, [editingId]);

  async function add(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const body = draft.trim();
    if (body.length === 0) {
      setError('A note needs some text.');
      return;
    }

    setAdding(true);
    setError(undefined);

    const result = await requestJson<Note>(`/api/todos/${todo.id}/notes`, {
      method: 'POST',
      ...jsonBody({ body }),
    });

    setAdding(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setDraft('');
    onChanged();
  }

  function startEditing(note: Note): void {
    setEditingId(note.id);
    setEditDraft(note.body);
    setError(undefined);
  }

  function stopEditing(): void {
    setEditingId(undefined);
    setEditDraft('');
    setError(undefined);
  }

  async function save(event: FormEvent<HTMLFormElement>, note: Note): Promise<void> {
    event.preventDefault();

    const body = editDraft.trim();
    if (body.length === 0) {
      setError('A note needs some text.');
      return;
    }
    if (body === note.body) {
      stopEditing();
      return;
    }

    setBusyId(note.id);
    setError(undefined);

    const result = await requestJson<Note>(`/api/todos/${todo.id}/notes/${note.id}`, {
      method: 'PATCH',
      ...jsonBody({ body }),
    });

    setBusyId(undefined);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    stopEditing();
    onChanged();
  }

  async function remove(note: Note): Promise<void> {
    setBusyId(note.id);
    setError(undefined);

    const result = await requestJson(`/api/todos/${todo.id}/notes/${note.id}`, {
      method: 'DELETE',
    });

    setBusyId(undefined);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onChanged();
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      stopEditing();
    }
  }

  return (
    <div className="notes">
      {error === undefined ? null : (
        <p className="notice notice--error notes__error" role="alert">
          {error}
        </p>
      )}

      {notes.length === 0 ? (
        <p className="notes__empty">No notes on this task yet.</p>
      ) : (
        <ul className="note-list">
          {notes.map((note) => (
            <li aria-busy={busyId === note.id} className="note" key={note.id}>
              {editingId === note.id ? (
                <form className="note-edit" onSubmit={(event) => void save(event, note)}>
                  <label className="sr-only" htmlFor={`note-edit-${note.id}`}>
                    Note
                  </label>
                  <textarea
                    className="input note__input"
                    disabled={busyId === note.id}
                    id={`note-edit-${note.id}`}
                    maxLength={NOTE_MAX_LENGTH}
                    onChange={(event) => setEditDraft(event.target.value)}
                    onKeyDown={handleEditKeyDown}
                    ref={editRef}
                    rows={3}
                    value={editDraft}
                  />
                  <div className="note__actions">
                    <button
                      className="button button--primary"
                      disabled={busyId === note.id}
                      type="submit"
                    >
                      {busyId === note.id ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      className="button"
                      disabled={busyId === note.id}
                      onClick={stopEditing}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="note__body">{note.body}</p>
                  <div className="note__footer">
                    <p className="note__meta">Added {timestampFormatter.format(note.createdAt)}</p>
                    <div className="note__actions">
                      <button
                        className="button"
                        disabled={busyId === note.id}
                        onClick={() => startEditing(note)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="button button--ghost"
                        disabled={busyId === note.id}
                        onClick={() => void remove(note)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form aria-busy={adding} className="note-form" onSubmit={(event) => void add(event)}>
        <label className="sr-only" htmlFor={`note-new-${todo.id}`}>
          New note
        </label>
        <textarea
          className="input note__input"
          disabled={adding}
          id={`note-new-${todo.id}`}
          maxLength={NOTE_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a note…"
          rows={2}
          value={draft}
        />
        <button className="button button--primary" disabled={adding} type="submit">
          {adding ? 'Adding…' : 'Add note'}
        </button>
      </form>
    </div>
  );
}
