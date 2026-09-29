# To-Do App
 
A full-stack task manager where every task can carry its own notes. Create, view, edit, complete, and delete tasks, and add notes to any task.
 
**Live demo:** <add Vercel URL after deploy>
 
Built for HNG Internship 15, Stage 1, entirely with an AI coding agent (Cline). The rules the agent followed, including testing requirements, are in [AGENTS.md](./AGENTS.md).
 
## Features
 
- Create, view, edit, complete, and delete tasks
- Add, edit, and delete notes on each task
- Input validation and clear error messages
- API endpoint tests with Vitest
## Tech Stack
 
- Next.js (App Router) and TypeScript
- Neon Postgres with Drizzle ORM
- Vitest for tests
- Deployed on Vercel
## Getting Started
 
1. Clone the repository and install dependencies:
```bash
   npm install
```
2. Create a `.env.local` file in the project root and set your database connection string:
```
   DATABASE_URL=your_postgres_connection_string
```
3. Run the database migrations:
```bash
   npm run db:migrate
```
4. Start the dev server:
```bash
   npm run dev
```
5. Open http://localhost:3000
## Running Tests
 
```bash
npm test
```
 
The tests cover the API endpoints, including success cases, validation errors, and not-found cases.
 
## Environment Variables
 
| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon) |
 
Never commit `.env` or `.env.local`.
 
## API Overview
 
- `/api/tasks`: list and create tasks
- `/api/tasks/[id]`: read, update, and delete a task
- Notes endpoints: add, list, edit, and delete notes for a task
## Deployment
 
The app is deployed on Vercel. Add `DATABASE_URL` in the Vercel project's environment variables and run the migrations against the production database.
