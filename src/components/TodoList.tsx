'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { TodoItem } from '@/components/TodoItem';
import type { Note, Todo } from '@/db/schema';
import { jsonBody, requestJson } from '@/lib/api-client';

export interface TodoListProps {
  todos: Todo[];
  /** Notes per todo id, loaded by the Server Component. */
  notesByTodo: Record<string, Note[]>;
}

/** Renders the task list and owns every task API call plus its error message. */
export function TodoList({ todos, notesByTodo }: TodoListProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  // Which row has its notes expanded. Kept here (not in `TodoItem`) so the panel
  // stays open across the `router.refresh()` that follows every mutation.
  const [notesTodoId, setNotesTodoId] = useState<string | undefined>(undefined);

  function toggleNotes(todo: Todo): void {
    setNotesTodoId((current) => (current === todo.id ? undefined : todo.id));
  }

  /** Run a request for one row; `false` means the caller should stay put. */
  async function mutate(todo: Todo, init: RequestInit): Promise<boolean> {
    setBusyId(todo.id);
    setError(undefined);

    try {
      const result = await requestJson(`/api/todos/${todo.id}`, init);

      if (!result.ok) {
        setError(result.message);
        return false;
      }

      // Re-render the Server Component so the list reflects the database.
      router.refresh();
      return true;
    } finally {
      setBusyId(undefined);
    }
  }

  function toggle(todo: Todo): Promise<boolean> {
    return mutate(todo, { method: 'PATCH', ...jsonBody({ isCompleted: !todo.isCompleted }) });
  }

  function rename(todo: Todo, title: string): Promise<boolean> {
    return mutate(todo, { method: 'PATCH', ...jsonBody({ title }) });
  }

  function remove(todo: Todo): Promise<boolean> {
    return mutate(todo, { method: 'DELETE' });
  }

  const remaining = todos.filter((todo) => !todo.isCompleted).length;

  return (
    <section aria-labelledby="todos-heading" className="todos">
      <div className="todos__header">
        <h2 id="todos-heading">Your tasks</h2>
        {todos.length === 0 ? null : (
          <p className="todos__summary">
            {remaining === 0 ? 'All done' : `${remaining} of ${todos.length} left`}
          </p>
        )}
      </div>

      {error === undefined ? null : (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {todos.length === 0 ? (
        <p className="empty">Nothing here yet. Add your first task above.</p>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <TodoItem
              busy={busyId === todo.id}
              key={todo.id}
              notes={notesByTodo[todo.id] ?? []}
              notesOpen={notesTodoId === todo.id}
              onDelete={remove}
              onNotesChanged={() => router.refresh()}
              onRename={rename}
              onToggle={toggle}
              onToggleNotes={toggleNotes}
              todo={todo}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
