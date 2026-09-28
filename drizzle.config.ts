import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load local env files so `npm run db:*` picks up DATABASE_URL.
// Missing files are ignored; DATABASE_URL is validated below (see AGENTS.md).
loadEnv({ path: ['.env.local', '.env'], quiet: true });

// `db:generate` only diffs the schema against the committed migrations, so it
// must work without a real connection (CI, fresh clone). Commands that do connect
// (`db:migrate`, `db:push`, `db:studio`) fail with a clear Postgres auth/host
// error when DATABASE_URL is unset, which is why the reason is explained here.
const url = process.env.DATABASE_URL ?? 'postgresql://unset:unset@localhost:5432/todo_app';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  strict: true,
  verbose: true,
  dbCredentials: { url },
});
