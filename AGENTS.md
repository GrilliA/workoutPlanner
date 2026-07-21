# AGENTS.md — workoutPlanner

Guida per agenti e contributor. Leggere prima di modificare codice.

---

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

**CI:** push o PR su `main` → GitHub Actions (`.github/workflows/ci.yml`): `be` typecheck + test, `fe` lint + build (Node 22).

- `be/.env` credentials: `postgres:postgres` (must match `docker-compose.yml`)
- Frontend web calls relative `/api/...` URLs; Vite proxies in dev
- **Native app** (`mobile/`): absolute API URL via `EXPO_PUBLIC_API_URL` (see `mobile/.env.example`). Simulator: `http://127.0.0.1:3005/api`; physical device: LAN IP of the host. Auth uses header `X-Client: mobile` + SecureStore refresh token (web keeps httpOnly cookies).
- UI copy in **Italian** (reference: TRACCIA Figma dashboard)
- Project log and roadmap: `WORKBOOK.md`
- Mobile onboarding / glossary: [`mobile/README.md`](mobile/README.md)

---

## Repository layout

```
workoutPlanner/
├── be/          # Express + Drizzle + Postgres
├── fe/          # React + Vite + TypeScript (web)
├── mobile/      # Expo React Native + TypeScript (iOS/Android)
├── WORKBOOK.md  # decisions, done, next steps
└── AGENTS.md    # this file
```

### Frontend web (`fe/`)

| Path | Purpose |
| --- | --- |
| `src/` | React app (pages, components, api, auth) |
| `src/utils/platform.ts` | `isNative()` always false on web; native = `mobile/` |

### Mobile (`mobile/`)

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router screens (file-based routes) |
| `src/api/` | HTTP client + Zod (ported from `fe`, mobile auth headers) |
| `src/auth/` | AuthProvider + SecureStore refresh |
| `README.md` | Glossary web→RN + “cosa/perché” log |

See [`mobile/README.md`](mobile/README.md) before changing mobile code.

### Frontend web (`fe/src/`)

| Path | Purpose |
| --- | --- |
| `api/` | HTTP client, Zod schemas, typed request/response |
| `components/` | **Shared** UI primitives only (`button/`, `input/`, `card/`, `skeleton/`, `appshell/`) |
| `pages/` | Route entry points — each page can host its feature folder |
| `utils/` | Small shared helpers |

**Rule:** a screen/feature (e.g. dashboard) lives **under its page**, not in `components/`.

```
pages/home/
├── index.tsx              # thin shell: AppShell + Dashboard
└── dashboard/             # home feature (all dashboard code here)
    ├── api.ts
    ├── useDashboard.ts
    ├── types.ts
    ├── mappers/mapDashboard.ts
    ├── dashboard/         # root component
    ├── todaycard/
    └── …
```

`pages/home/index.tsx` wires layout only — no business logic.

---

## Module folder structure

### Folders → always lowercase

**All folders** use lowercase — including React component folders. No PascalCase, no kebab-case.

```
todaycard/
├── TodayCard.tsx    # React component file (PascalCase)
├── style.css
└── index.tsx
```

```tsx
// todaycard/index.tsx
export { TodayCard } from "./TodayCard";

// todaycard/TodayCard.tsx
import "./style.css";
```

Import from outside the feature: `import { Dashboard } from "@dashboard/dashboard"`

Import **inside** the feature: use **relative paths** between siblings:

```tsx
// pages/home/dashboard/dashboard/Dashboard.tsx
import { useDashboard } from "../useDashboard";
import { TodayCard } from "../todaycard";

// pages/home/dashboard/todaycard/TodayCard.tsx
import type { TodayWorkout } from "../types";
```

The `@dashboard` alias points to `pages/home/dashboard/` (for imports from outside the feature).

### Non-component code → lowercase files at feature root

Hooks, types, API helpers, mappers — flat lowercase files or lowercase subfolders:

```
pages/home/dashboard/
├── api.ts
├── useDashboard.ts
├── types.ts
├── mappers/
│   └── mapDashboard.ts
├── dashboard/
│   ├── Dashboard.tsx
│   ├── style.css
│   └── index.tsx
└── todaycard/
```

Compound primitives (`button/`, `input/`, `card/`) follow the same folder pattern under `components/`, with `primitives/` and `context/` subfolders.

| Kind | Naming | Example |
| --- | --- | --- |
| Folder | lowercase | `todaycard/`, `button/`, `mappers/` |
| React component file | PascalCase `.tsx` | `TodayCard.tsx` |
| Hook, types, api, mappers | lowercase `.ts` | `useDashboard.ts`, `mappers/mapDashboard.ts` |
| CSS inside component | lowercase | `style.css` |
| Backend routes | lowercase | `routes/workouts.ts` |

### Rules

| Rule | Detail |
| --- | --- |
| Public API for components | Always through `index.tsx` |
| Styles | `style.css` co-located in the component folder, imported only inside the `.tsx` |
| No kebab-case | Never `today-card/`, `use-dashboard.ts` |
| Imports inside feature | relative | `../types`, `./api`, `../todaycard` |
| Imports outside feature | `@dashboard/*` alias | `@dashboard/dashboard` from `pages/home/index.tsx` |
| Shared components | `@components/*` | `@components/button` |

---

## Naming conventions

### PascalCase — React component files only

| OK | Avoid |
| --- | --- |
| `todaycard/TodayCard.tsx` | `todaycard/todaycard.tsx` |
| `button/Button.tsx` | `button/button.tsx` |

### lowercase — folders and non-component files

| OK | Avoid |
| --- | --- |
| `todaycard/` | `TodayCard/` |
| `components/skeleton/` | `components/Skeleton/` |
| `useDashboard.ts` | `UseDashboard.ts` |
| `mappers/mapDashboard.ts` | `MapDashboard/MapDashboard.ts` |
| `style.css` | `Style.css`, `today-card.css` |
| `routes/workouts.ts` | `routes/Workouts.ts` |

### Code identifiers

- **Components / types / classes:** PascalCase (`TodayCard`, `DashboardData`)
- **Functions / variables / hooks:** camelCase (`buildDashboardData`, `useDashboard`)
- **Constants:** UPPER_SNAKE_CASE when truly constant (`EMPTY_STAT_PLACEHOLDERS`)
- **CSS class names:** kebab-case in CSS is fine (`.today-card`, `.stat-grid`) — this is DOM/CSS convention, not file naming

### Path aliases

Prefer aliases over deep relative imports:

- `@api`, `@api/*`
- `@components/*`
- `@dashboard`, `@dashboard/*`
- `@pages/*`
- `@utils/*`

---

## Programming style: functional first

Write **functional** code. React components are functions; business logic should be pure functions composed together.

### Do

- **Pure functions** for data transformation and mapping (no I/O, no mutation)
- **Immutable data** — spread/copy instead of `.push()`, `.sort()` in place, or property assignment on shared objects
- **Composition** — small functions combined (`sortByNewest` → `mapRecentWorkouts` → `buildDashboardData`)
- **Named exports** — one main export per file when practical
- **Thin hooks** — `useDashboard` orchestrates fetch + state; mapping lives in `mappers/mapDashboard.ts`
- **Separate components** instead of mutating function properties (`StatCardSkeleton` as its own export, not `StatCard.Skeleton = …`)
- **`const` over `let`** — reassign only when unavoidable (e.g. cancellation flags in effects)

### Avoid

- Classes for domain logic (HTTP `ApiError` is an acceptable exception for `instanceof` checks)
- Compound-component mutation (`Component.Sub = SubComponent`)
- Business logic inside JSX or large `useEffect` blocks
- Cross-layer imports (e.g. feature components importing hooks from `pages/`)
- Imperative loops when `map` / `filter` / `reduce` express intent clearly

### React patterns

```ts
// OK — pure mapper
export function mapRecentWorkouts(workouts: Workout[]): RecentWorkout[] {
  return sortByNewest(workouts).map(toRecentWorkout);
}

// OK — thin hook
export function useDashboard() {
  const [state, setState] = useState(initialState);
  useEffect(() => { void loadDashboard(setState); }, [fetchId]);
  return state;
}

// Avoid — mapper mixed with fetch inside the hook body
// Avoid — StatCard.Skeleton = StatCardSkeleton
```

### Backend

- Route handlers may have side effects (DB, HTTP) — keep them thin
- Extract validation and query building into pure helpers where it helps readability
- File names **lowercase**: `routes/workouts.ts`, `routes/exercises.ts`

---

## CSS conventions

- One `style.css` per component folder — imported only inside the component `.tsx`
- Single root block class per component (`.today-card`, `.stat-card`) — kebab-case in CSS is fine
- Nest selectors under the root block; use CSS variables from the design tokens (`--bg`, `--accent`, `--surface`, `--border`, `--text`, `--text-h`)
- **Mobile-first layout:** base styles target phone; use `min-width` only (see `fe/src/styles/layout.css` for `--bp-*` tokens)
- **Page width:** reuse `.page-container` / `.page-container--wide` from `layout.css` — do not hardcode `max-width: 640px` per feature
- **Shell breakpoint:** sidebar at `64rem` (`--bp-lg`); bottom nav below that
- **Grids:** prefer `auto-fit` / `minmax` and `@container` on feature roots (e.g. `.dashboard`) over viewport hacks
- Never import a component's `style.css` from outside its folder

---

## API layer (frontend)

- All requests go through `@api` (`apiRequest` + Zod decode)
- Request/response shapes live in `api/schemas/`
- Feature code imports from `@api`, never raw `fetch` in components

---

## Dashboard feature (current)

The home screen is the TRACCIA dashboard at `/`.

```
fe/src/pages/home/dashboard/
├── api.ts
├── useDashboard.ts
├── types.ts
├── mappers/
│   └── mapDashboard.ts
├── dashboard/
├── todaycard/
├── statcard/
├── workoutrow/
├── topbar/
└── weekstrip/
```

`@dashboard` alias → `pages/home/dashboard/`

`pages/home/index.tsx` → `<AppShell><Dashboard /></AppShell>` via `@dashboard/dashboard`.

---

## Git / branches

`main` is the integration branch. Feature work happens on short-lived branches, one **chunk or concern** per branch.

### Naming

```
<type>/<chunk>-<slug>
```

| Part | Values | Example |
| --- | --- | --- |
| `type` | `feat`, `fix`, `refactor`, `chore` | `feat` |
| `chunk` | Roadmap ID when applicable (`C*`, `B*`, `A*`, `W*`) | `B2` |
| `slug` | Short kebab-case description | `session-logging` |

Examples: `feat/B2-session-logging`, `feat/A1-auth-backend`, `fix/auth-refresh-failure`, `refactor/dashboard-pages-layout`.

Do **not** use auto-generated `cursor/...` branch names for ongoing work.

### Workflow

1. Update `main`: `git switch main && git pull`
2. Create branch: `git switch -c feat/B2-session-logging`
3. Implement one chunk (or one isolated fix)
4. Open a PR → merge into `main`
5. Delete the feature branch after merge
6. Next task: repeat from step 1

### Agent rule

Before modifying code on a non-trivial task, propose **branch name + short plan** and wait for confirmation. If the user is still on a stale or unrelated branch, suggest switching or creating the correct one first.

---

## Git / commits

- Conventional Commits: `feat(fe): …`, `feat(be): …`, `fix(fe): …`
- One concern per commit when possible
- Update `WORKBOOK.md` when completing a roadmap chunk (C*, B*)
- Do not commit unless explicitly asked
- **No Cursor attribution** in commit messages: never add `Co-authored-by: Cursor`, `Made-with: Cursor`, or similar trailers

### Attribution setup (one-time per clone)

1. **Cursor IDE:** Settings → Agents → Attribution → disable Commit Attribution and PR Attribution
2. **CLI agent:** ensure `~/.cursor/cli-config.json` has `"commitAttribution": false` and `"prAttribution": false`
3. **Git hook** (strips trailers even if Cursor adds them):

```bash
chmod +x .githooks/prepare-commit-msg
ln -sf ../../.githooks/prepare-commit-msg .git/hooks/prepare-commit-msg
```

---

## Roadmap snapshot

See `WORKBOOK.md` for full detail.

| Chunk | Status |
| --- | --- |
| C0–C6 (dashboard UI + API wire) | ✅ done |
| C6b (dashboard stats wire) | ✅ done |
| C6c (TodayCard schedule) | ✅ done |
| W5 (create program UI) | ✅ done |
| W6 (set prescriptions + edit) | ✅ done |
| A2 (account settings) | ✅ done |
| B1 (exercises API) | ✅ done |
| B2 (session logging) | ✅ |
| W3 (active workout UI) | ✅ |
| B3 (stats endpoints) | ✅ |
| B4 (program days) | ✅ |
| B5 (exercise catalog search) | ✅ |
| W8 (exercise picker UI) | ✅ |
| C7 (analytics) | ✅ done |
| W7 (session recap) | ✅ done |
| C8 (WeekStrip schedule) | ✅ done |
| C9 (schedule override UI) | ✅ done |
| C10 (WeekStrip polish) | ✅ done |
