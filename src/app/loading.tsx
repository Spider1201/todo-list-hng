const skeletonRows = ['first', 'second', 'third'];

/** Skeleton shown while the task list is being fetched (App Router streaming). */
export default function Loading() {
  return (
    <section aria-busy="true" aria-live="polite" className="todos">
      <div className="todos__header">
        <h2>Your tasks</h2>
      </div>
      <p className="sr-only">Loading your tasks…</p>
      <ul className="todo-list">
        {skeletonRows.map((row) => (
          <li className="todo todo--skeleton" key={row}>
            <span className="skeleton skeleton--mark" />
            <span className="skeleton skeleton--text" />
          </li>
        ))}
      </ul>
    </section>
  );
}
