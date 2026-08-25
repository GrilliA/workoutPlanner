# AGENTS.md — workoutPlanner

Read this before changing code. FE/BE style, git, and agent process live in [Guidelines](#guidelines), not here.

## Dev environment

```bash
# Database
npm run db:up          # Postgres via Docker Compose
npm run db:push        # sync schema in dev (quick)
npm run db:generate    # create SQL migration in be/drizzle/
npm run db:migrate     # apply migrations

# Backend (port 3005)
cd be && npm run dev
cd be && npm test     # unit tests (stats, schedule helpers)

# Frontend web (Vite, proxy /api → localhost:3005)
cd fe && npm run dev

# Mobile native (Expo React Native — requires Node ≥22)
cd mobile && npm start            # Expo Dev Tools (i / a for simulators)
cd mobile && npm run typecheck
```

**CI:** push or PR to `main` → GitHub Actions (`.github/workflows/ci.yml`): `be` typecheck + test, `fe` lint + build, `mobile` typecheck (Node 22).

- `be/.env` credentials: `postgres:postgres` (must match `docker-compose.yml`)
- Frontend web: relative `/api/...` URLs; Vite proxies them in dev
- **Native** (`mobile/`): API base in `mobile/src/api/config.ts` (Railway prod). Auth: `X-Client: mobile` header + SecureStore. Web keeps httpOnly cookies.
- UI copy is **Italian**
- Log / roadmap: `WORKBOOK.md`
- Mobile onboarding: [`mobile/README.md`](mobile/README.md)

## Repository layout

```
workoutPlanner/
├── be/                 # Express + Drizzle + Postgres
├── fe/                 # React + Vite (coach panel)
├── mobile/             # Expo React Native (athlete)
├── docs/guidelines/    # conventions split by area
├── WORKBOOK.md
└── AGENTS.md
```

| Path | Purpose |
| --- | --- |
| `fe/src/pages/` | Screen + feature folder (not under `components/`) |
| `fe/src/components/` | Shared UI primitives only |
| `mobile/app/` | Expo Router routes |
| `mobile/src/api/` | HTTP + Zod (same contract as web, mobile auth) |

## Guidelines

| Area | File |
| --- | --- |
| Agent process (names, finish check, ask with options) | [`docs/guidelines/agents.md`](docs/guidelines/agents.md) |
| Git / branch / commit | [`docs/guidelines/git.md`](docs/guidelines/git.md) |
| Frontend web (folders, React, CSS, API) | [`docs/guidelines/fe.md`](docs/guidelines/fe.md) |
| Backend | [`docs/guidelines/be.md`](docs/guidelines/be.md) |
| Mobile | [`mobile/README.md`](mobile/README.md) |
| Decisions and roadmap | [`WORKBOOK.md`](WORKBOOK.md) |
