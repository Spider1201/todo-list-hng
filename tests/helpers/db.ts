import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { createDb, type Database } from '@/db';
import { todos } from '@/db/schema';
import { requiredTestDatabaseUrl } from '@/lib/env';

export interface TestDb {
  db: Database;
  /** Delete every row so tests start from a known state. */
  truncate: () => Promise<void>;
  /** Close the connection and undo the `DATABASE_URL` override. */
  dispose: () => Promise<void>;
}

/**
 * Open a client against `TEST_DATABASE_URL`, apply the committed migrations and
 * point the app's default connection at the same database so Route Handlers
 * under test use it too. Call this from `beforeAll` of DB-backed tests.
 */
export async function setupTestDb(): Promise<TestDb> {
  const url = requiredTestDatabaseUrl();
  const { db, close } = createDb(url);

  await migrate(db, { migrationsFolder: 'src/db/migrations' });

  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = url;

  return {
    db,
    truncate: async () => {
      await db.execute(sql`truncate table ${todos} cascade`);
    },
    dispose: async () => {
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
      await close();
    },
  };
}
