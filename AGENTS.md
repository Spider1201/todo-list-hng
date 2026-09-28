# AGENTS.md

Guidance for AI agents (and humans) working in this repository. Read this before
changing any code.

## What this project is

A small To-Do app: users create, list, update, complete/uncomplete and delete
to-do items, and attach free-form notes to any task. The app is a JSON API
(Next.js Route Handlers) plus a minimal UI that consumes it. Scope is
intentionally small - two resources, `todo` and its nested `note` - and the
project must stay deployable to Vercel at all times.

## Stack

| Concern       | Choice                                                    |
| ------------- | --------------------------------------------------------- |
| Framework     | Next.js (App Router, Route Handlers, Server Components)   |
| Language      | TypeScript, `strict` (see `tsconfig.json`)                |
| Database      | PostgreSQL via Drizzle ORM, migrations with `drizzle-kit` |
| Validation    | zod (every body, query param and route param)             |
| Tests         | Vitest (`npm test`)                                       |
| Lint / format | ESLint + Prettier                                         |
| Hosting       | Vercel, with managed Postgres (Neon / Supabase / Vercel)  |

Node `>=22` (see `engines` in `package.json`).

## Folder structure

```text
todo-app/
├─ AGENTS.md                  # this file
├─ package.json               # scripts: dev, build, lint, format, typecheck, test, db:*
├─ next.config.ts             # Next.js config
├─ tsconfig.json              # strict TS, path alias `@/*` -> `./src/*`
├─ eslint.config.mjs          # flat ESLint config
├─ vitest.config.ts           # test runner config (tests/**)
├─ verify.cmd                 # local pipeline: format, lint, typecheck, test, build
├─ final.cmd                  # verify.cmd + smoke.ps1 - the full local gate
├─ smoke.ps1                  # live smoke test: dev server, page, /api/todos
├─ drizzle.config.ts          # drizzle-kit config (reads DATABASE_URL)
├─ .env.example               # documents required env keys (committed)
├─ src/
│  ├─ app/                    # App Router
│  │  ├─ layout.tsx           # root layout (header, <main>, footer)
│  │  ├─ globals.css          # global styles, imported by layout.tsx
│  │  ├─ page.tsx             # task list page (Server Component, force-dynamic)
│  │  ├─ loading.tsx          # skeleton shown while the list streams in
│  │  ├─ error.tsx            # client error boundary with a retry button
│  │  ├─ not-found.tsx        # 404 UI
│  │  └─ api/todos/
│  │     ├─ route.ts          # GET /api/todos, POST /api/todos
│  │     ├─ [id]/route.ts     # GET, PATCH, DELETE /api/todos/:id
│  │     └─ [id]/notes/
│  │        ├─ route.ts       # GET, POST /api/todos/:id/notes
│  │        └─ [noteId]/route.ts  # PATCH, DELETE /api/todos/:id/notes/:noteId
│  ├─ components/             # client components: TodoForm, TodoList, TodoItem, NotesPanel
│  ├─ db/
│  │  ├─ index.ts             # Drizzle client (pooled Postgres connection)
│  │  ├─ schema.ts            # table definitions + inferred types
│  │  └─ migrations/          # generated SQL - never edited by hand
│  └─ lib/
│     ├─ api-client.ts        # zod-checked fetch helper for client components
│     ├─ env.ts               # typed env access + DATABASE_URL validation
│     ├─ http.ts              # json / error response helpers (server side)
│     ├─ notes.ts             # data access for the note resource
│     ├─ todos.ts             # data access for the todo resource
│     └─ validators/
│        ├─ note.ts           # zod schemas for the note resource
│        └─ todo.ts           # zod schemas for the todo resource
└─ tests/
   ├─ helpers/                # test-db setup (db.ts), request/todo/note factories
   ├─ api/                    # one test file per handler - contract tests plus:
   │                          #   todos.route.test.ts, todos-id.route.test.ts,
   │                          #   notes.route.test.ts, notes-id.route.test.ts,
   │                          #   todos.integration.test.ts (real Postgres, skipped by default)
   └─ lib/                    # api-client.test.ts, http.test.ts, validators/*.test.ts
```

Rule of thumb: Route Handlers stay thin (parse -> validate -> call `src/lib` ->
respond). All database access lives in `src/db` or `src/lib`, never in
components, so it stays unit-testable.

## Naming conventions

- **Folders**: lowercase, kebab-case (`validators`, `todo-list`). Route segments
  mirror the URL in kebab-case, with dynamic segments in brackets (`app/api/todos/[id]/route.ts`).
- **Route files**: Next.js reserves the names `page.tsx`, `layout.tsx`, `route.ts`,
  `not-found.tsx`, `loading.tsx`, `error.tsx` - use them as-is.
- **React components**: one component per file, file named after the component in
  PascalCase (`src/components/TodoList.tsx` exports `TodoList`).
- **Other modules**: kebab-case files exporting camelCase functions
  (`src/lib/todos.ts` -> `listTodos`, `createTodo`). Tests mirror the source path:
  `tests/lib/http.test.ts`, `tests/api/todos.route.test.ts`.
- **Database**: tables plural snake_case (`todos`), columns snake_case
  (`created_at`, `is_completed`). Drizzle exports a camelCase table const
  (`todos`) and the TS types are always inferred, never re-declared by hand:
  `export type Todo = typeof todos.$inferSelect;` / `NewTodo = typeof todos.$inferInsert;`.
- **Schemas / types**: zod schemas are camelCase with a `Schema` suffix
  (`createTodoSchema`, `updateTodoSchema`, `todoIdSchema`) and live in
  `src/lib/validators/<resource>.ts`. Types and interfaces are PascalCase with no
  `I` prefix; type-only imports use `import type` (required by `verbatimModuleSyntax`).
- **Env vars**: `SCREAMING_SNAKE_CASE` (`DATABASE_URL`, `TEST_DATABASE_URL`),
  accessed only through `src/lib/env.ts` - never `process.env.X` inline.

## Code style

Config lives in `.prettierrc.json`, `.prettierignore` and `eslint.config.mjs`.

- Prettier is the source of truth for formatting: single quotes, semicolons,
  trailing commas, 2-space indent, 100 character print width, arrow parens always.
  Run `npm run format`; verify with `npm run format:check`. Do not hand-format.
- ESLint (flat config, `eslint-config-next` + `typescript-eslint`) must pass with
  no warnings: `npm run lint` (auto-fix with `npm run lint:fix`).
- TypeScript: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitOverride`. No `any` (use `unknown` + zod), no
  non-null assertions (`!`), no `@ts-ignore` (use `@ts-expect-error` only with a
  comment explaining why).
- Import across folders with the alias `@/*` (e.g. `import { getDb } from '@/db';`,
  `import { createTodoSchema } from '@/lib/validators/todo';`); use relative paths
  only within the same folder.
- Server Components are the default; add `'use client'` at the top of a file only
  when it needs state, effects or event handlers.
- Route Handlers are always `async`, are exported per HTTP verb
  (`export async function GET(...)`), and receive `params` as a promise:
  `{ params }: { params: Promise<{ id: string }> }` - `await params` before use
  (mandatory in Next 15/16).
- Never leave `console.log` in committed code; prefer returning/propagating errors.

## UI conventions

- `page.tsx` stays a Server Component and reads data through `src/lib`; interactivity
  lives in client components in `src/components` (one component per file, PascalCase).
- Client components never call `fetch` directly. They go through
  `src/lib/api-client.ts` (`requestJson`, `jsonBody`), which validates the response
  envelope with zod and returns `{ ok: true, data } | { ok: false, message }`. Never
  throw from an event handler to show an error - render the returned message.
- After a successful mutation call `router.refresh()` and let the Server Component
  re-read the database; do not keep a second copy of the list in client state.
- Every async action needs a pending state (`disabled` + `aria-busy`, button text
  such as "Adding…"/"Saving…") and a failure state (`role="alert"` text). One row's
  request must not block the others.
- `loading.tsx` owns the skeleton. `error.tsx` is the safety net for unexpected
  render errors (with a retry via `reset()`), while _expected_ load failures (for
  example a missing `DATABASE_URL`) are caught in `page.tsx` and rendered as a
  server-rendered notice so non-JS clients see the message too.
- Styling is plain CSS in `src/app/globals.css`: BEM-ish class names
  (`.todo__actions`), theming through custom properties, mobile-first layout with a
  single 640px breakpoint, visible `:focus-visible` rings, and a
  `prefers-reduced-motion` fallback for animations. No inline styles.
- Format dates with an explicit `timeZone` (we use UTC) so server-rendered HTML and
  the client's hydration pass produce identical text.

## API conventions

Base path `/api`. One `route.ts` per resource, one HTTP verb per export.

| Method   | Path                             | Success                   | Body / notes                           |
| -------- | -------------------------------- | ------------------------- | -------------------------------------- |
| `GET`    | `/api/todos`                     | `200`                     | `{ "data": Todo[] }`, newest first     |
| `POST`   | `/api/todos`                     | `201` + `Location` header | body `{ "title": string }`             |
| `GET`    | `/api/todos/[id]`                | `200`                     | `{ "data": Todo }`                     |
| `PATCH`  | `/api/todos/[id]`                | `200`                     | body `{ "title"?, "isCompleted"? }`    |
| `DELETE` | `/api/todos/[id]`                | `204` (empty body)        | `404` when the id does not exist       |
| `GET`    | `/api/todos/[id]/notes`          | `200`                     | `{ "data": Note[] }`, newest first     |
| `POST`   | `/api/todos/[id]/notes`          | `201` + `Location` header | body `{ "body": string }`              |
| `PATCH`  | `/api/todos/[id]/notes/[noteId]` | `200`                     | body `{ "body": string }`              |
| `DELETE` | `/api/todos/[id]/notes/[noteId]` | `204` (empty body)        | `404` when the note is not on the task |

- Success bodies are always wrapped in `data`; failures always use
  `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
  Build them with the helpers in `src/lib/http.ts` (`jsonOk`, `jsonCreated`,
  `jsonNoContent`, `jsonError`) instead of calling `Response.json` directly.
- Status codes: `200` OK, `201` created, `204` deleted, `400` validation failed,
  `404` no row with that id, `409` conflict, `500` unexpected error.
- Errors are machine-readable: `code` is a stable `SCREAMING_SNAKE_CASE` token
  (`VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`); `message` is human readable
  and safe to show; `details` holds zod `issues` for validation failures.
- Never leak internal errors, SQL text or stack traces to the client - log
  server-side, return `INTERNAL_ERROR` to the caller.
- Prefer Server Components reading `src/lib` directly; use the API routes from the
  browser (client components) and from tests.
- Nested resources are always scoped by their parent: every note query filters on
  `todoId` as well as `noteId`, so a note can never be read or changed through
  another task's URL. A mismatched pair is a `404`, never a cross-task write.
- A note's parent must exist: `POST /api/todos/[id]/notes` and
  `GET /api/todos/[id]/notes` resolve the task first and return `404` otherwise,
  so clients get a clear error instead of a foreign-key `500`.

## Validation and error handling

- Every request body, query string and route param is validated with zod before
  it reaches the database. Parse with `safeParse` and return `400` with the
  issues; do not throw raw zod errors out of a Route Handler.
- `todoIdSchema` validates the `[id]` param as a UUID; a malformed id is a `400`
  (or `404` if you resolve it through a lookup) - never a `500`.
- Route Handlers wrap their work in `try`/`catch`; the `catch` returns a `500`
  JSON error envelope (and re-throws non-`Error` values only after logging them).
- Boundary rule: validation happens in the handler, business/DB logic in
  `src/lib/todos.ts` (pure functions where possible, `zod`-typed inputs).

## Database and migrations

- Schema lives in `src/db/schema.ts`; the client in `src/db/index.ts` (single
  pooled `postgres` connection, reused across hot reloads in dev).
- Generate migrations with `npm run db:generate` and apply them with
  `npm run db:migrate`. Files under `src/db/migrations/` are generated - never
  edit or add them by hand (Prettier ignores that folder for the same reason).
- Use `npm run db:push`/`db:studio` for local experiments only; committed work
  must ship a generated migration.
- Timestamps are `timestamptz` with defaults; ids are `uuid` with
  `defaultRandom()`; `is_completed` is `boolean` with `default(false)`.
- `notes` belongs to a task through `todo_id` (`uuid`, not null, `on delete
cascade`), so deleting a task removes its notes and no orphan rows survive.
  Note bodies are `text` with a zod limit of `NOTE_MAX_LENGTH`.

## Rules for every change (non-negotiable)

1. **Validate all API input (zod)** and return proper status codes and JSON errors.
   No handler may touch the database with unvalidated input.
2. **Write tests for every API endpoint you create**, covering success,
   validation errors, and not-found cases. An endpoint without tests is not done.
3. **Always run the tests and confirm the endpoints work before saying a task is
   done** - report the exact commands run and their results; never claim success
   from reading code alone.
4. **Never hardcode secrets.** Use environment variables, keep `.env`/`.env.*` out
   of git (only `.env.example` is committed).
5. **Keep changes small and explain what you changed.** One focused change at a
   time; summarize the files touched, why, and anything the reviewer must verify.

## Testing rules

- Vitest, run with `npm test` (`npm run test:watch` while developing). Test files
  live under `tests/` and match the source layout, named `*.test.ts`.
- Each Route Handler needs a contract test file (`tests/api/todos.route.test.ts`
  for the collection, `tests/api/todos-id.route.test.ts` for `[id]`,
  `tests/api/notes.route.test.ts` and `tests/api/notes-id.route.test.ts` for the
  nested note routes) asserting at minimum:
  - success (`200`/`201`/`204` + body shape),
  - validation error (`400` + `VALIDATION_ERROR` code and issue details),
  - not-found (`404` + `NOT_FOUND`) for `[id]` routes,
  - `500` + `INTERNAL_ERROR` when the data layer throws.
- Contract tests call the exported handler functions with a `Request` plus
  `{ params: Promise.resolve({ id }) }` and mock `@/lib/todos` with `vi.mock`, so
  they run without a database. `tests/api/todos.integration.test.ts` instead runs
  the handlers against real PostgreSQL through `tests/helpers/db.ts`, which applies
  the committed migrations to `TEST_DATABASE_URL`; it is skipped when that key is
  unset, so `npm test` also works offline.
- Unit-test zod schemas in `tests/lib/validators/todo.test.ts` and
  `tests/lib/validators/note.test.ts` for valid input, missing fields, wrong
  types, empty/oversized strings, and unknown keys - unknown keys are rejected
  (`z.strictObject`), not silently stripped.
- In tests, `activeDatabaseUrl()` resolves to `TEST_DATABASE_URL`, so a test run can
  never reach the development database even when `DATABASE_URL` is set.
- Before declaring anything done run, in order: `npm run format:check`,
  `npm run lint`, `npm run typecheck`, `npm test`. Fix failures - do not skip.

## Secrets and environment variables

- Required keys: `DATABASE_URL` (runtime + drizzle-kit) and `TEST_DATABASE_URL`
  (tests only). Both are documented in `.env.example`.
- Local setup: `Copy-Item .env.example .env.local` and fill in real values.
- Production: set the same keys in Vercel -> Project Settings -> Environment
  Variables (Production, Preview, Development). No secrets in code, tests,
  migrations, README, or committed JSON.
- `.gitignore` already excludes `.env` and `.env.*` while keeping `.env.example`;
  do not weaken that. If a new variable is needed, add it to `.env.example` with a
  comment and read it through `src/lib/env.ts`.
- Never echo secret values in tool output, logs or error messages.

## Workflow and definition of done

Task loop for any change: read this file -> read the code you are about to touch ->
make the smallest change that satisfies the request -> add/update tests -> run the
verification commands -> report. Follow the existing patterns instead of inventing
new ones, and do not refactor unrelated code in the same change.

The commands to run and report:

```powershell
npm run format:check   # Prettier
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # Vitest (must pass, DB-backed tests skipped without TEST_DATABASE_URL)
npm run build          # before shipping / when touching app/ routing or config
```

The same pipeline is wrapped for local runs:

```powershell
.\verify.cmd   # format, format:check, typecheck, lint, test, build -> logs to %TEMP%
.\smoke.ps1    # start next dev, exercise the page and /api/todos over HTTP, stop it
               #   pass -Port <n> if 3000 is busy - it refuses to test a server it did not start
.\final.cmd    # verify.cmd followed by smoke.ps1 - the full local gate
```

These helpers write every artifact they produce (request payloads, the page dump,
the log, the dev-server output) to `%TEMP%\todo-app-smoke` and nothing into the
repository: `payload-malformed.json` is deliberately invalid JSON, which Prettier
cannot parse, so a copy in the repo root would break `npm run format:check` - and
a dumped `page.html` would be rewritten by `npm run format`.

Definition of done for a feature or endpoint:

- [ ] Input validated with zod; JSON success/error envelope matches the contract above.
- [ ] Correct status codes for success, validation errors and not-found cases.
- [ ] Tests added or updated for every endpoint touched and passing locally.
- [ ] UI: new actions show a pending state, failures render in `role="alert"`, and
      the page still works from 320px wide up (no horizontal scrolling).
- [ ] `format:check`, `lint`, `typecheck`, `test` all pass (paste the results).
- [ ] No secret committed; new env keys added to `.env.example`.
- [ ] A short summary explains the files changed, the reason, and anything unverified.

## Other commands

```powershell
npm run dev            # next dev  -> http://localhost:3000
npm run build          # next build
npm run start          # next start (production server, after build)
npm run db:generate    # drizzle-kit generate -> src/db/migrations
npm run db:migrate     # drizzle-kit migrate  -> apply migrations
npm run db:check       # drizzle-kit check    -> validate migration consistency
npm run db:studio      # drizzle-kit studio   -> local DB browser
npm run test:coverage  # vitest run --coverage
```

## Deployment (Vercel)

- The repo deploys as a standard Next.js app; `npm run build` must succeed before
  pushing. Migrations are applied separately with `npm run db:migrate` against the
  production `DATABASE_URL` (they are not run automatically during the build).
- Put the database connection in Vercel environment variables (see above) and use
  a pooled connection string (`-pooler` host for Neon, port 6543 for Supabase) so
  serverless invocations do not exhaust connections.
- Keep `.vercel` and all env files out of git; they are already ignored.

## Editing this file

When conventions change, update this file in the same change and keep it short,
concrete and consistent with the code that actually exists in the repo.
