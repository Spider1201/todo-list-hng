'use client';

import { useEffect } from 'react';

/**
 * Error boundary for the page. Shown when the Server Component throws - for
 * example when DATABASE_URL is missing or the database is unreachable.
 */
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ui] page render failed', error);
  }, [error]);

  // Next redacts server error messages in production, so only show them locally.
  const detail = process.env.NODE_ENV === 'development' ? error.message : undefined;

  return (
    <section className="notice notice--error" role="alert">
      <h2 className="notice__title">We could not load your tasks</h2>
      <p>Something went wrong on the server. Nothing was lost - try again in a moment.</p>
      {detail === undefined ? null : <p className="notice__detail">{detail}</p>}
      <p className="notice__hint">
        Still failing? Check that <code>DATABASE_URL</code> is set and that the migrations have run
        (<code>npm run db:migrate</code>) - see AGENTS.md.
      </p>
      <button className="button button--primary" onClick={() => reset()} type="button">
        Try again
      </button>
    </section>
  );
}
