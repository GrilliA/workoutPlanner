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
| 2026-06-24 | Use Docker Compose Postgres (`docker-compose.yml`) as the dev database | Already shipped in the repo via `npm run db:up`; keeps the documented workflow intact. |
| 2026-06-24 | `be/.env` uses `postgres:postgres` credentials (not the `user:password` in `.env.example`) | Must match the credentials in `docker-compose.yml` for the API to connect. |
| 2026-06-24 | Use `npm run db:push` to sync schema (no migration files yet) | `be/drizzle/` is empty; Drizzle `push` syncs the schema directly during early development. |
| 2026-06-24 | Update script only refreshes npm deps in `be/` and `fe/` | Docker/system deps and service startup are environment/AGENTS.md concerns, not the startup script. |
| 2026-06-24 | Home page = the "Dashboard" from the Figma reference (TRACCIA app) | The reference's main screen is the dashboard; that is what we build as `/`. |
| 2026-06-24 | Build the home **mobile-first** and fluid (CSS `auto-fit` grids, no JS breakpoints) | One component tree reflows 1→2→3→4 columns; less code, more control. |
| 2026-06-24 | Mobile/tablet nav = `BottomNav`; reuse existing `Sidebar` on desktop (≥1024px) | Thumb-friendly on phones; the Sidebar is already built and styled. |
| 2026-06-24 | Build the home against **mock data first**, wire to API incrementally | Current DB only has `workouts`/`exercises`; volume/RIR/TUT/streak need new tables later. |
| 2026-06-24 | UI copy in **Italian** to match the reference ("OGGI", "AVVIA WORKOUT", "ULTIMI ALLENAMENTI") | Keep parity with the approved design. |
| 2026-06-24 | Reference design tokens already align with repo (`--bg #16171d`, `--accent` lime, Barlow Condensed) | No token overhaul needed; reuse existing CSS variables. |

---

## What we did

- 2026-06-24 — Set up and verified the dev environment: installed `be/` and `fe/` deps, started Postgres via Docker Compose, applied schema, ran both dev servers, and confirmed the API can create/read a workout. Documented startup caveats in `AGENTS.md`.

---

## Home page — chunked roadmap

Built step by step. Each chunk is **small, independently reviewable, and shippable on its own branch/PR**. Do them in order; stop after each for review before starting the next. Frontend chunks (C*) use mock data until the matching backend chunk (B*) lands.

Legend: ⬜ todo · 🟡 in progress · ✅ done

### Frontend track

- **C0 — Responsive AppShell + home route** ⬜
  - Deliver: layout wrapper that renders `Sidebar` (≥1024px) and `TopBar`+`BottomNav` (<1024px), with the home content area in the middle. Placeholders only.
  - Done when: `/` shows the shell; nav switches correctly at the 1024px breakpoint; lint+build pass.
- **C1 — TopBar + WeekStrip** ⬜
  - Deliver: greeting + date + avatar + bell; horizontal day pills with "today" highlighted (derived from current date).
  - Done when: today pill is correct; strip scrolls horizontally on mobile.
- **C2 — TodayCard ("OGGI")** ⬜
  - Deliver: hero workout card (name, exercise preview, goal, duration) + `AVVIA WORKOUT` using existing `Button` primary. Mock data.
  - Done when: card matches reference spacing/colors at mobile + desktop.
- **C3 — Stat grid (Volume / Workout / Streak / Record)** ⬜
  - Deliver: reusable `StatCard` (value + label + trend) in an `auto-fit` grid (2-up phone → 4-up desktop). Mock data.
  - Done when: grid reflows fluidly with no JS breakpoints.
- **C4 — Recent workouts list ("ULTIMI ALLENAMENTI")** ⬜
  - Deliver: `WorkoutRow` (icon + name + date/min/kg + chevron) + section header with "Vedi >". Mock data.
  - Done when: rows match reference; list reflows 1→2 cols on tablet.
- **C5 — Empty + loading states** ⬜
  - Deliver: first-run empty state (no workouts) + skeleton placeholders.
  - Done when: states render when data is empty/loading.
- **C6 — Wire home to real `workouts` API** ⬜ (needs B1)
  - Deliver: fetch real workouts + exercise counts; replace mock for the parts the API can supply.
  - Done when: list/TodayCard reflect DB data; mocks remain only for not-yet-modeled metrics.
- **C7 — Analytics (charts) v2** ⬜ (needs B2/B3)
  - Deliver: 1RM/volume sparkline, weekly-volume bars, "Prossimi workout". Desktop right column / mobile lower section.
  - Done when: charts render real stats.

### Backend track

- **B1 — `exercises` router + counts** ⬜
  - Deliver: `GET /api/exercises`, nested create, and exercise count per workout (e.g. `GET /api/workouts?withCounts=1`).
- **B2 — Session logging schema** ⬜
  - Deliver: `sessions` (workout instance: date, duration, total volume) + `set_logs` (weight, reps, RIR, TUT) tables + migrations.
- **B3 — Stats endpoints** ⬜
  - Deliver: weekly volume, workout frequency, current streak, PRs, 1RM trend.

## Other next steps (not home-page)

- [ ] Implement authentication (Login/Logout routes exist in the UI but have no backend auth).
- [ ] Add the missing FE routes referenced in the UI (`/forgot-password`, `/settings`, `/logout`).
- [ ] Add real migration files via `npm run db:generate` once the schema stabilizes (instead of relying on `db:push`).
- [ ] Add automated tests (backend currently has no test script; `npm test` is a placeholder).
