import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

import * as schema from '@/db/schema';
import { activeDatabaseUrl } from '@/lib/env';

export type Database = PostgresJsDatabase<typeof schema>;

let pool: Sql | undefined;
let database: Database | undefined;

/**
 * Lazily created singleton client, so importing this module never opens a
 * connection (and tests that import `@/lib/todos` do not need a database).
 * `prepare: false` keeps the driver compatible with pooled/serverless Postgres.
 *
 * Reused across hot reloads in development because the module scope survives
 * per-process; call `closeDb()` to release it (used by tests and scripts).
 */
export function getDb(): Database {
  if (database === undefined) {
    pool = postgres(activeDatabaseUrl(), { max: 1, prepare: false });
    database = drizzle(pool, { schema });
  }
  return database;
}

/** Build an isolated client for an explicit URL - used by DB-backed tests. */
export function createDb(url: string): { db: Database; close: () => Promise<void> } {
  const client = postgres(url, { max: 1, prepare: false });
  return {
    db: drizzle(client, { schema }),
    close: async () => {
      await client.end();
    },
  };
}

/** Close the singleton pool, if one was opened. Safe to call more than once. */
export async function closeDb(): Promise<void> {
  const current = pool;
  pool = undefined;
  database = undefined;
  if (current !== undefined) {
    await current.end();
  }
}
