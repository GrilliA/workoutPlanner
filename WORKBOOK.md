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
| 2026-06-24 | Home page = the "Dashboard" from the Figma reference (TRACCIA app) | The reference's main screen is the dashboard; that is what we build as `/`. |
| 2026-06-24 | Build the home **mobile-first** and fluid (CSS `auto-fit` grids, no JS breakpoints) | One component tree reflows 1→2→3→4 columns; less code, more control. |
| 2026-06-24 | Mobile/tablet nav = `BottomNav`; reuse `Sidebar` on desktop (≥1024px) | Thumb-friendly on phones; sidebar already built and styled. |
| 2026-06-24 | Build the home against **mock data first**, wire to API incrementally | Current DB only has `workouts`/`exercises`; volume/RIR/TUT/streak need new tables later. |
| 2026-06-24 | UI copy in **Italian** to match the reference ("OGGI", "AVVIA WORKOUT", "ULTIMI ALLENAMENTI") | Keep parity with the approved design. |
| 2026-06-24 | Reference design tokens already align with repo (`--bg #16171d`, `--accent` lime, Barlow Condensed) | No token overhaul needed; reuse existing CSS variables. |
| 2026-06-24 | Use Vite dev proxy for `/api` → `http://localhost:3005` (Phase A, Option 1) | Frontend can call relative `/api/...` URLs in dev without CORS; no extra backend middleware. |
| 2026-06-24 | Use Zod in the frontend API layer to encode requests and decode responses (Phase B) | Runtime validation catches backend shape drift early; shared schemas keep request/response types accurate. |
| 2026-06-24 | Use Docker Compose Postgres (`docker-compose.yml`) as the dev database | Already shipped in the repo via `npm run db:up`; keeps the documented workflow intact. |
| 2026-06-24 | `be/.env` uses `postgres:postgres` credentials (not the `user:password` in `.env.example`) | Must match the credentials in `docker-compose.yml` for the API to connect. |
| 2026-06-24 | Use `npm run db:push` to sync schema (no migration files yet) | `be/drizzle/` is empty; Drizzle `push` syncs the schema directly during early development. |
| 2026-06-24 | Update script only refreshes npm deps in `be/` and `fe/` | Docker/system deps and service startup are environment/AGENTS.md concerns, not the startup script. |

---

## What we did

- 2026-07-13 — B3 stats endpoints: `GET /api/stats` with weekly volume, workouts/week, Rome-timezone streak, record volume, and recent completed sessions; FE Zod + `getStats`.
- 2026-07-13 — W3 active workout UI: `/sessions/:sessionId` page, session header, exercise cards, set logging, focus mode AppShell, TodayCard “AVVIA WORKOUT” wired to B2 API.
- 2026-07-13 — B2 session logging: `workout_sessions` + `logged_sets` schema, REST API (start/complete/list sessions, log/patch/delete sets), FE Zod schemas + `@api` client. One `in_progress` session per user; `weight_kg` nullable; RIR/TUT optional.
- 2026-07-07 — C6 wire home to API: `useDashboard` calls `getWorkouts` + `getExercisesByWorkout`, maps to dashboard shape, error banner with retry; stats/duration/volume stay placeholder until B3.
- 2026-06-27 — B1 exercises router + counts: nested `GET/POST /api/workouts/:id/exercises`, `GET /api/exercises/:id`, `exerciseCount` on workout list/detail; FE Zod schemas + `@api` client.
- 2026-06-27 — C5 empty + loading states: `Skeleton` primitive, `useDashboard` hook (mock delay + `?state=` dev toggle), section-level skeletons on TodayCard/StatCard/WorkoutRow, Italian empty copy.
- 2026-06-24 — Rebuilt Home as TRACCIA Figma dashboard (C0–C4): AppShell, TopBar, WeekStrip, TodayCard, StatCard grid, WorkoutRow list. Mock data + Italian copy.
- 2026-06-24 — Added `Card` compound component and API wiring (Phases A–B); kept `@api` client for later C6 integration.
- 2026-06-24 — Set up and verified the dev environment: installed `be/` and `fe/` deps, started Postgres via Docker Compose, applied schema, ran both dev servers, and confirmed the API can create/read a workout. Documented startup caveats in `AGENTS.md`.

---

## Home page — chunked roadmap

Legend: ⬜ todo · 🟡 in progress · ✅ done

### Frontend track

- **C0 — Responsive AppShell + home route** ✅
- **C1 — TopBar + WeekStrip** ✅
- **C2 — TodayCard ("OGGI")** ✅
- **C3 — Stat grid (Volume / Workout / Streak / Record)** ✅
- **C4 — Recent workouts list ("ULTIMI ALLENAMENTI")** ✅
- **C5 — Empty + loading states** ✅
- **C6 — Wire home to real `workouts` API** ✅
- **C7 — Analytics (charts) v2** ⬜ (needs B2/B3)

### Backend track

- **B1 — `exercises` router + counts** ✅
- **B2 — Session logging schema + API** ✅
- **B3 — Stats endpoints** ✅

## Other next steps

- [ ] Implement authentication (Login/Logout routes exist in the UI but have no backend auth).
- [ ] Add the missing FE routes referenced in the UI (`/forgot-password`, `/settings`, `/logout`).
- [ ] Add real migration files via `npm run db:generate` once the schema stabilizes (instead of relying on `db:push`).
- [ ] Add automated tests (backend currently has no test script; `npm test` is a placeholder).
