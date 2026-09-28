import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'To-Do',
  description: 'A small task list built with Next.js, Drizzle ORM and PostgreSQL.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page">
          <header className="page__header">
            <h1 className="page__title">To-Do</h1>
            <p className="page__tagline">Add a task, tick it off, keep moving.</p>
          </header>
          <main className="page__main">{children}</main>
          <footer className="page__footer">
            <p>
              Tasks live in PostgreSQL and are served by <code>/api/todos</code>.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
