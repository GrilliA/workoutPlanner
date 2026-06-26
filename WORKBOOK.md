# Workout Planner Workbook

Source of truth for project status, decisions, and change history. Update this before/with meaningful code changes.

## Current Status

| Phase | Name | Status |
|---|---|---|
| 0 | Foundation | 🟡 In progress |
| 1 | Workout CRUD | 🟡 In progress |
| 2 | Exercise CRUD | ⏳ Pending |
| 3 | Auth + user-owned data | ⏳ Pending |
| 4 | Planner UX | ⏳ Pending |
| 5 | Polish | ⏳ Pending |

## Project Snapshot

- Backend: Express 5 + TypeScript + Drizzle ORM + Postgres.
- Frontend: React 19 + Vite + Wouter + plain CSS.
- Database: local Postgres via `docker-compose.yml`.
- Current API: `/api/workouts` list/create and `/api/workouts/:id` read.
- Current UI: home/sidebar shell and static login page.

## Decisions

| # | Date | Decision | Status | Reason |
|---|---|---|---|---|
| 1 | 2026-06-23 | Use Express + Drizzle + Postgres for the API | ✅ Current | Already scaffolded; simple typed SQL path. |
| 2 | 2026-06-23 | Use React + Vite + Wouter for the frontend | ✅ Current | Already scaffolded; small router, no extra framework. |
| 3 | 2026-06-23 | Use plain colocated CSS | ✅ Current | Keeps styling simple and matches existing files. |
| 4 | 2026-06-23 | Avoid new dependencies unless they remove more code than they add | ✅ Locked | Keep the MVP small. |
| 5 | 2026-06-23 | Route shells in `fe/src/layouts` (camelCase); sidebar in `components` | ✅ Current | Separates app chrome from page content and reusable nav UI. |
| 6 | 2026-06-23 | Nested root-block CSS + functional React on the frontend | ✅ Current | Sidebar sets the default CSS pattern; named exports, const data, `.map()`. |

## Change History

| # | Date | Change | Reason |
|---|---|---|---|
| 1 | 2026-06-23 | Initialized `WORKBOOK.md` and `AGENTS.md` | Give future agents a project map and rules. |
| 2 | 2026-06-23 | Added `appLayout` and extracted `Sidebar` component | Logged-in routes share one shell; login stays full-page. |
| 3 | 2026-06-23 | Documented frontend CSS and functional React conventions in `AGENTS.md` | Lock in sidebar-style nesting and functional patterns for future UI. |

## Phase Details

### Phase 0: Foundation 🟡 In progress

- [x] Backend package scaffolded
- [x] Frontend package scaffolded
- [x] Docker Postgres configured
- [x] Drizzle configured
- [x] Basic Express app mounted at `/api`
- [ ] Add a real backend health endpoint
- [ ] Add one minimal backend check/test command
- [ ] Add one minimal frontend check beyond build/lint if needed

### Phase 1: Workout CRUD 🟡 In progress

- [x] `workouts` table
- [x] List workouts
- [x] Read workout by id
- [x] Create workout
- [ ] Update workout
- [ ] Delete workout
- [ ] Show workouts in frontend
- [ ] Create workout from frontend

### Phase 2: Exercise CRUD ⏳ Pending

- [x] `exercises` table scaffolded
- [ ] List exercises for workout
- [ ] Add exercise to workout
- [ ] Update exercise
- [ ] Delete exercise
- [ ] Show exercises in frontend

### Phase 3: Auth + user-owned data ⏳ Pending

- [ ] Pick auth approach
- [ ] Add users table
- [ ] Login/register API
- [ ] Login/register UI wiring
- [ ] Restrict workouts to owner

### Phase 4: Planner UX ⏳ Pending

- [ ] Workout detail page
- [ ] Weekly/monthly planner shape
- [ ] Empty/loading/error states
- [ ] Mobile-friendly layout

### Phase 5: Polish ⏳ Pending

- [ ] Form validation cleanup
- [ ] Accessibility pass
- [ ] README setup instructions
- [ ] Production build sanity check
