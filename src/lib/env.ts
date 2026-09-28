const MISSING_ENV_HINT =
  'Copy .env.example to .env.local, fill it in, then restart the server (see AGENTS.md -> Secrets and environment variables).';

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim().length === 0 ? undefined : value;
}

/**
 * Connection string used by the app at runtime and by drizzle-kit.
 * Throws when it is missing, so a misconfigured deployment fails loudly instead
 * of silently connecting somewhere unexpected.
 */
export function databaseUrl(): string {
  const value = readEnv('DATABASE_URL');
  if (value === undefined) {
    throw new Error(`DATABASE_URL is not set. ${MISSING_ENV_HINT}`);
  }
  return value;
}

/**
 * Connection string for DB-backed tests. `undefined` means no test database is
 * configured, in which case those tests skip instead of failing.
 */
export function testDatabaseUrl(): string | undefined {
  return readEnv('TEST_DATABASE_URL');
}

/** True when a separate test database is configured (see AGENTS.md -> Testing rules). */
export function hasTestDatabase(): boolean {
  return testDatabaseUrl() !== undefined;
}

/** Connection string used by DB-backed tests. */
export function requiredTestDatabaseUrl(): string {
  const value = testDatabaseUrl();
  if (value === undefined) {
    throw new Error(`TEST_DATABASE_URL is not set. ${MISSING_ENV_HINT}`);
  }
  return value;
}

/**
 * Connection string for the current process. Tests are pinned to
 * `TEST_DATABASE_URL` so a test run can never touch the development database.
 */
export function activeDatabaseUrl(): string {
  if (process.env.NODE_ENV === 'test') {
    return requiredTestDatabaseUrl();
  }
  return databaseUrl();
}
