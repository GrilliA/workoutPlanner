# workoutPlanner — Workbook

A living log of **decisions made**, **what we did**, and **what to do next**. Update this file whenever we make a meaningful decision or finish a piece of work, so we always remember the context.

How to use:
- Add new entries to the top of each list (most recent first).
- Keep entries short: what + why.
- Move items from "Next steps" to "What we did" when completed.

---

## Decisions log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-06-24 | Use Vite dev proxy for `/api` → `http://localhost:3005` (Phase A, Option 1) | Frontend can call relative `/api/...` URLs in dev without CORS; no extra backend middleware. |
| 2026-06-24 | Use Zod in the frontend API layer to encode requests and decode responses (Phase B) | Runtime validation catches backend shape drift early; shared schemas keep request/response types accurate. |
| 2026-06-24 | Use Docker Compose Postgres (`docker-compose.yml`) as the dev database | Already shipped in the repo via `npm run db:up`; keeps the documented workflow intact. |
| 2026-06-24 | `be/.env` uses `postgres:postgres` credentials (not the `user:password` in `.env.example`) | Must match the credentials in `docker-compose.yml` for the API to connect. |
| 2026-06-24 | Use `npm run db:push` to sync schema (no migration files yet) | `be/drizzle/` is empty; Drizzle `push` syncs the schema directly during early development. |
| 2026-06-24 | Update script only refreshes npm deps in `be/` and `fe/` | Docker/system deps and service startup are environment/AGENTS.md concerns, not the startup script. |

---

## What we did

- 2026-06-24 — Phase B: added `fe/src/api/` with Zod schemas and a typed client for workouts (`getWorkouts`, `getWorkout`, `createWorkout`).
- 2026-06-24 — Phase A: added Vite dev proxy (`/api` → `http://localhost:3005`) so the frontend can call the backend without CORS in local dev.
- 2026-06-24 — Set up and verified the dev environment: installed `be/` and `fe/` deps, started Postgres via Docker Compose, applied schema, ran both dev servers, and confirmed the API can create/read a workout. Documented startup caveats in `AGENTS.md`.

---

## Next steps

- [ ] Wire the frontend to the backend API (currently the Login form only calls `preventDefault`; Home page has no data fetching).
  - [x] Phase A — Vite dev proxy for `/api`
  - [x] Phase B — API client with Zod encode/decode
  - [ ] Phase C — Home page UI (workout list + create form)
  - [ ] Phase D — Loading, empty, and error states
- [ ] Implement authentication (Login/Logout routes exist in the UI but have no backend auth).
- [ ] Add API routes + schema usage for `exercises` (table exists in `be/src/db/schema/exercises.ts` but has no router).
- [ ] Add the missing FE routes referenced in the UI (`/forgot-password`, `/settings`, `/logout`).
- [ ] Add real migration files via `npm run db:generate` once the schema stabilizes (instead of relying on `db:push`).
- [ ] Add automated tests (backend currently has no test script; `npm test` is a placeholder).
