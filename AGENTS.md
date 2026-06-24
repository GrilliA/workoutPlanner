# workoutPlanner

A workout planner monorepo:

- `be/` — Express 5 + Drizzle ORM + PostgreSQL API (TypeScript, runs on port `3005`).
- `fe/` — React 19 + Vite frontend (TypeScript, dev server on port `5173`).

> Project log: see `WORKBOOK.md` for the running log of decisions made and next steps. Update it whenever a meaningful decision is made or work is completed.

## Cursor Cloud specific instructions

### Services overview

| Service | Dir | Run (dev) | Port | Notes |
| --- | --- | --- | --- | --- |
| Backend API | `be/` | `npm run dev` | 3005 | Needs Postgres + `be/.env`. |
| Frontend | `fe/` | `npm run dev` | 5173 | Standalone; does not call the API yet. |
| Postgres | repo root | `npm run db:up` (in `be/`) or `docker compose up -d` | 5432 | Via `docker-compose.yml`. |

### Database (Postgres via Docker) — non-obvious caveats

- The DB runs through `docker-compose.yml`. There is no systemd in this VM, so start the Docker daemon manually before using compose: `sudo dockerd` (run it in a background tmux session; leave it running).
- `be/.env.example` credentials (`user:password`) do NOT match `docker-compose.yml` (`postgres:postgres`). Create `be/.env` with:
  ```
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workout_planner
  PORT=3005
  ```
- After Postgres is up, create the schema with `npm run db:push` (from `be/`). Drizzle migration files live in `be/drizzle/` (currently empty; `db:push` syncs the schema directly).

### Lint / test / build

- Frontend lint: `npm run lint` (in `fe/`). Frontend build: `npm run build` (in `fe/`).
- Backend has no lint or test script (`npm test` is a placeholder that exits 1). Typecheck the backend with `npx tsc --noEmit` (in `be/`).

### Startup order to run the app end to end

1. `sudo dockerd` (background) → `docker compose up -d` (repo root) to start Postgres.
2. Ensure `be/.env` exists (see above), then `cd be && npm run db:push`.
3. `cd be && npm run dev` (API on 3005).
4. `cd fe && npm run dev` (UI on 5173).

Quick API smoke test: `curl -X POST http://localhost:3005/api/workouts -H 'Content-Type: application/json' -d '{"name":"Leg Day"}'`.
