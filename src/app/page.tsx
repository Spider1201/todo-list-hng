import Link from 'next/link';

import { TodoForm } from '@/components/TodoForm';
import { TodoList } from '@/components/TodoList';
import type { Note, Todo } from '@/db/schema';
import { listNotes } from '@/lib/notes';
import { listTodos } from '@/lib/todos';

// Rendered per request: the list must never be baked into the build output.
export const dynamic = 'force-dynamic';

/**
 * Load failure state. Rendered by the Server Component (not `error.tsx`) so the
 * message is part of the streamed HTML even before client JavaScript runs.
 */
function LoadError() {
  return (
    <section className="notice notice--error" role="alert">
      <h2 className="notice__title">We could not load your tasks</h2>
      <p>Something went wrong on the server. Nothing was lost - try again in a moment.</p>
      <p className="notice__hint">
        Still failing? Check that <code>DATABASE_URL</code> is set and that the migrations have run
        (<code>npm run db:migrate</code>) - see AGENTS.md.
      </p>
      <Link className="button button--primary" href="/">
        Try again
      </Link>
    </section>
  );
}

export default async function HomePage() {
  let todos: Todo[];
  let notesByTodo: Record<string, Note[]>;

  try {
    todos = await listTodos();

    // Notes are fetched per task and handed to the list as a plain map, so the
    // client components never fetch on render. Only the task the user expands
    // actually renders them.
    const noteLists = await Promise.all(todos.map((todo) => listNotes(todo.id)));
    notesByTodo = Object.fromEntries(todos.map((todo, index) => [todo.id, noteLists[index] ?? []]));
  } catch (error) {
    console.error('[page] failed to load tasks', error);
    return <LoadError />;
  }

  return (
    <>
      <TodoForm />
      <TodoList notesByTodo={notesByTodo} todos={todos} />
    </>
  );
}
