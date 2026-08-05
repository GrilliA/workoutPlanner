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
| 2026-08-02 | Dual-mode atleta: self-register mobile + schede self editabili; coach via codice invite (max 1); programma coach ha priorità (annulla per cambiare); coach vede storico | Acquisizione senza frizione + coach workflow; reverse-pivot controllato dal self-service totale |
| 2026-07-30 | Assignment lifecycle hardening: `workouts.isActive` sincronizzato con status/date assegnazione; gate sessione atleta su assignment attiva; assign da TXT atomico in transazione; migration `0006` elimina programmi legacy self-service atleta e normalizza `is_active` | Evitare schede fantasma attive, sessioni su programmi non assegnati, stati incoerenti post-pivot coach |
| 2026-07-30 | Import TXT: weekday per giorno = ordine sequenziale (Giorno 1 → Lun, Giorno 2 → Mar, …) se non specificati nel testo | Allineare parser AI/TXT al calendario settimanale senza chiedere weekday espliciti |
| 2026-07-30 | Web atleta (`fe/src/pages/home`, `sessions`, `stats`, …) **non routato**; solo coach + landing/auth; builder `workouts/new` riusato dal coach | Athlete UX solo su mobile; ridurre superficie web morta in attesa di cleanup PR |
| 2026-07-28 | Style guide landing HTML: palette `#1D1F25` / `#C7F464` / `#166534` / `#E0E0E0`, font Roboto, landing pubblica su `/`, dashboard coach su `/dashboard` | Unificare brand identity al codice style fornito |
| 2026-07-28 | Import scheda da TXT (incolla) su template e assegnazione da zero; giorni logici numerati; prompt AI copiabile | Velocizzare creazione schede con AI esterna senza UI upload file |
| 2026-07-27 | Web (`fe/`) = **pannello coach**; atleti su **mobile**; schede template + assegnazione con `startsAt`/`expiresAt`; atleta solo logga | Pivot da self-service a coach→clienti; template riutilizzabili o scheda da zero; date di validità sull’assegnazione |
| 2026-07-25 | Mobile start = **picker scheda attiva + giorno**; schede `isActive` (disattiva/riattiva); create/edit con **prescription per serie** (reps + recupero) | Evitare “sempre la scheda più nuova / tutto il ciclo”; più programmi convivono; serie 10→8 e rest diversi senza lasciare il modello BE |
| 2026-07-21 | Mobile path = **Expo React Native** in `mobile/` (TypeScript); Capacitor retired from `fe/` | Native UI/notifications without WebView; separate toolchain from Vite; didactic README in `mobile/` |
| 2026-07-21 | Auth refresh = cookie (web) **and** JSON body when `X-Client: mobile` + SecureStore | RN has no httpOnly cookie jar; keep web unchanged |
| 2026-07-21 | Share Zod/API lazily (copy into `mobile/` first; `packages/shared` later) | Avoid monorepo day-1; extract only when duplication hurts |
| 2026-07-19 | Exercise catalog = **vendored** [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) (~873 exercises), searched via our BE (`GET /api/catalog/exercises`) — not a live third-party call | Compared GitHub/hosted options: **Kinetic** (`api.kinetic.place`, 899 ex) works but public tier ~50 req/day — too low; **wger** has IT translations + public API but network dependency and CC-BY-SA content; **ExerciseDB** free tier is non-commercial. free-exercise-db is public-domain JSON + images on GitHub raw, no API key, offline-capable after seed. English names are fine for gym UX (IT UI copy stays Italian). |
| 2026-07-16 | ~~Mobile path = Capacitor-first inside `fe/` (not RN, PWA later)~~ **superseded 2026-07-21** | Was: reuse web UI; unlock native rest-timer notifications; keep one frontend folder |
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

- 2026-08-04 — U1 mobile Home density (UX Pilot): WeekStrip 7 giorni, TodayCard densità + badge, KPI 2-up da `/stats`, recent con volume; mock HTML in `docs/mocks/uxpilot-home-session/`.
- 2026-08-02 — A3 athlete dual-mode: mobile self-register; invite codes (generate/redeem/unlink, 1 coach); self vs coach program permissions; session priority on active coach assignment (revoke by athlete or coach); mobile create (DIY + AI TXT prompt); coach client detail shows session history.
- 2026-07-30 — Assignment lifecycle: sync `isActive` ↔ assignment status/dates, session start gate per atleta, assign program/TXT in transazione, migration `0006` cleanup programmi legacy; doc `fe/src/pages/ATHLETE_WEB_DEPRECATED.md`.
- 2026-07-30 — Parser TXT: weekday sequenziali Lun→Dom per ordine giorno quando assenti nel testo.
- 2026-07-28 — Style guide landing: token CSS/mobile da HTML brand, pagina `/` pubblica (hero + Accedi/Prova Gratuita), coach home su `/dashboard`, font Roboto.
- 2026-07-28 — Brand Traccia: asset logo in `fe/src/assets/brand` + `mobile/assets/brand`, componente `BrandLogo`, auth web e login/register mobile col logo.
- 2026-07-28 — Import TXT scheda (incolla): parser `parseSchedaTxt`, UI su template create/edit, assegnazione da zero e edit programma cliente; bottone “Copia prompt AI”.
- 2026-07-27 — Coach admin v1: roles `coach`/`athlete`, `coach_athletes`, workout `kind` template/program, `program_assignments` (date + status), API `/api/coach/*` + `/api/assignments/active`, web pivot to coach dashboard/clienti/template/assegnazioni, mobile atleta read-only schede + solo logging.
- 2026-07-25 — Mobile UX: `workouts.is_active` + PATCH; Home picker scheda/giorno; disattiva/riattiva in lista; create/edit con serie variabili + recupero; sessione prefill reps dalla prossima prescription.
- 2026-07-26 — Mobile sessione: one-tap `LOG kg × reps`, edit/undo set locale, TERMINA dominante + abbandona dietro conferma; copy stato in italiano.
- 2026-07-21 — Expo RN `mobile/`: TypeScript + Expo Router, auth SecureStore, API Zod port, screens (login/home/workouts/stats/settings/session + rest timer). Capacitor removed from `fe/`. Docs: `mobile/README.md`.
- 2026-07-21 — BE auth dual delivery: cookie for web + optional `refreshToken` in JSON when `X-Client: mobile`; refresh/logout accept body token.
- 2026-07-19 — B5/W8 exercise catalog: vendored yuhonas/free-exercise-db, `exercise_catalog` + seed, `GET /api/catalog/*`, FE picker in AddExerciseForm with optional `catalogId`.
- 2026-07-17 — CAP2 rest timer nativo: countdown recupero post-set in sessione attiva, `RestTimer` (anello SVG), highlight `ExerciseCard`, Local Notifications + Haptics su Capacitor, fallback web (beep/vibrate), permessi al primo avvio native. *(native path moved to Expo `mobile/` on 2026-07-21)*
- 2026-07-17 — CAP1 Capacitor + mobile polish: scaffold iOS/Android, CORS/`VITE_API_URL`, safe-area/viewport, scroll fix shell, bottom nav 4 tab, layout fluido card sessioni. *(Capacitor retired 2026-07-21)*
- 2026-07-16 — CAP1 Capacitor scaffold: `@capacitor/*` in `fe/`, `capacitor.config.ts`, `ios/` + `android/`, `base: './'` Vite, script `cap:sync`/`cap:ios`/`cap:android`, helper `utils/platform.ts`. *(retired)*
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
- **B5 — Exercise catalog (search API)** ✅ — vendored free-exercise-db + `GET /api/catalog/*`
- **W8 — Exercise picker UI** ✅ — autocomplete in “Aggiungi esercizio” + optional `catalogId`

### Workout builder track

- **W8 — Exercise picker UI** ✅ (see above)

## B5 / W8 — implementation plan (8 PRs)

Merge **in order** (stacked branches). Each PR is one concern.

| # | Branch | Scope | Status |
| --- | --- | --- | --- |
| 1 | `cursor/b5-catalog-decision-docs-11e3` | Decision + roadmap | done |
| 2 | `cursor/b5-vendor-exercise-db-11e3` | Slim JSON under `be/data/` | done |
| 3 | `cursor/b5-catalog-schema-11e3` | `exercise_catalog` + migration | done |
| 4 | `cursor/b5-catalog-seed-11e3` | `npm run db:seed-catalog` | done |
| 5 | `cursor/b5-catalog-search-api-11e3` | Search / detail / facets + tests | done |
| 6 | `cursor/b5-catalog-fe-client-11e3` | FE Zod + `@api` client | done |
| 7 | `cursor/w8-exercise-picker-11e3` | Picker UI | done |
| 8 | `cursor/w8-wire-add-exercise-11e3` | Wire form + `catalogId` | done |

**API shape:**
- `GET /api/catalog/exercises?q=&muscle=&equipment=&level=&limit=&offset=`
- `GET /api/catalog/exercises/:id`
- `GET /api/catalog/facets`

**Setup after merge:** `cd be && npm run db:migrate && npm run db:seed-catalog`

**Out of scope:** live wger proxy, video demos, Italian name translation layer, user-owned custom catalog rows.

## Other next steps

- [ ] Smoke test end-to-end manuale (db + be + fe coach + mobile atleta Expo).
- [ ] Test FE (Vitest su mapper/utils).
- [ ] Route `/forgot-password` (link già presente in login).
- [ ] (Later) Cleanup PR: rimuovere pagine web atleta orfane (`home/`, `sessions/`, `stats/`, …); tenere solo `workouts/new` condiviso col coach.
- [ ] (Later) Optional wger IT names or user custom exercises on top of B5.
- [ ] Mobile UI vs UX Pilot: U2 Active Session density; U3 Coach Dashboard density (web).
- [ ] (Later) Mobile: polish restante atleta vs mock (override DayPicker su WeekStrip, empty states).
- [ ] (Later) Extract `packages/shared` if Zod/API copy between `fe` and `mobile` hurts.
