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
| 2026-07-16 | Mobile path = Capacitor-first inside `fe/` (not RN, PWA later) | Reuse web UI; unlock native rest-timer notifications; keep one frontend folder |
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

- 2026-07-17 — CAP1 Capacitor + mobile polish: scaffold iOS/Android, CORS/`VITE_API_URL`, safe-area/viewport, scroll fix shell, bottom nav 4 tab, layout fluido card sessioni.
- 2026-07-16 — CAP1 Capacitor scaffold: `@capacitor/*` in `fe/`, `capacitor.config.ts`, `ios/` + `android/`, `base: './'` Vite, script `cap:sync`/`cap:ios`/`cap:android`, helper `utils/platform.ts`.
- 2026-07-16 — C11 session history: `GET /sessions/history` paginato, pagina `/session-history`, link da dashboard e Progressi.
- 2026-07-14 — Responsive layout refactor: shared `layout.css` tokens, mobile-first AppShell, `.page-container` utilities, dashboard `@container` grids.
- 2026-07-15 — CI GitHub Actions: workflow su push/PR a `main` (BE typecheck + test, FE build con Node 22).
- 2026-07-15 — C10 WeekStrip polish: tap su un giorno della settimana per cambiare/ripristinare il programma di quel giorno.
- 2026-07-15 — Tech debt: fix FE TypeScript build errors, initial Drizzle migration (`be/drizzle/0000_*`), backend unit tests for stats and Rome schedule helpers.
- 2026-07-15 — C8 WeekStrip schedule: dashboard loads 7-day program via schedule API (Rome TZ), shows workout day or rest per weekday.
- 2026-07-14 — W7 session recap: read-only `/sessions/:id` for completed/abandoned sessions, WorkoutRow links from dashboard and stats.
- 2026-07-14 — C7 analytics page: extended `GET /stats` with `dailyBreakdown`, `totalSessions`, `averageSessionVolumeKg`; `/stats` Progressi page with stat grid, volume/activity charts, recent sessions.
- 2026-07-14 — A2 account settings: `/settings` page (name, read-only email, change password, logout); `PATCH /auth/me`, `PATCH /auth/password`.
- 2026-07-14 — C6c TodayCard schedule: dashboard resolves today's workout day via `getWorkoutScheduleToday`, shows day name + program, starts session with `workoutDayId`.
- 2026-07-14 — B4 program days: `workout_days`, `workout_day_weekdays`, `workout_schedule_overrides`; CRUD days/weekdays, schedule resolve + override (cambio giorno), session `workoutDayId`; migration script for existing workouts → default day; FE Zod + `@api/workoutdays`.
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
- **C6b — Wire dashboard stats + recent sessions** ✅
- **C6c — TodayCard from schedule** ✅
- **W5 — Create program UI (days + weekdays)** ✅
- **W6 — Set prescriptions + edit workout** ✅
- **A2 — Account settings** ✅
- **C7 — Analytics (charts) v2** ✅
- **W7 — Session recap (read-only history)** ✅
- **C8 — WeekStrip wired to schedule** ✅
- **C9 — Cambio giorno UI (schedule override)** ✅
- **C10 — WeekStrip schedule polish** ✅
- **C11 — Session history (lista paginata)** ✅

### Backend track

- **B1 — `exercises` router + counts** ✅
- **B2 — Session logging schema + API** ✅
- **B3 — Stats endpoints** ✅
- **B4 — Program days schema + API** ✅ (workout days, weekday schedule, date overrides)

## Other next steps

- [ ] Smoke test end-to-end manuale (db + be + fe).
- [ ] Test FE (Vitest su mapper/utils).
- [ ] Route `/forgot-password` (link già presente in login).
