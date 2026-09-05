# Frontend web (`fe/`)

React + Vite. UI copy is **Italian**. Style: functions, immutable data, pure mappers.

A feature (e.g. dashboard) lives **under its page**, not in `components/`. `components/` is shared UI primitives only (`button/`, `input/`, `card/`, `skeleton/`, `appShell/`, `pageHeader/`, `pageError/`).

Authenticated chrome (`AppShell`) lives once in the router (`App.tsx`), around the inner `Switch` of coach routes. Public routes (`/login`, `/register`, `/`) stay outside. A page `index.tsx` is the feature entry, not a layout wrapper.

```
pages/coach/dashboard/
├── index.tsx              # page entry: render the feature
└── dashboard/             # the whole feature
    ├── api/
    │   └── useDashboard.ts  # GET + loading; on error expose retry for PageError
    ├── types.ts
    ├── mappers/mapDashboard.ts
    ├── dashboard/
    └── athletestable/
```

Thin page entries have no business logic.

## Folders and files

**Component folders** are camelCase, matching the React file: `errorBoundary/ErrorBoundary.tsx`, `appShell/AppShell.tsx`.  
**Non-component folders** stay lowercase: `mappers/`, `primitives/`, `context/`, `schemas/`.  
**Route segments** stay lowercase: `pages/coach/clients/`.  
No kebab-case. No PascalCase folders (`ErrorBoundary/` is wrong). Single-word names stay as they are (`button/`, `card/`, `toast/`).

Existing **page** feature folders (`athletestable/`, …) still use concatenated lowercase. Leave them until a dedicated rename; do not mix that into unrelated work. (`coachpageheader/` was promoted to the shared `components/pageHeader/`.)

```
todayCard/
├── TodayCard.tsx    # only the React file is PascalCase
├── style.css
└── index.tsx        # public API
```

| Kind | Naming | Example |
| --- | --- | --- |
| Component folder | camelCase | `errorBoundary/`, `todayCard/` |
| Other folder | lowercase | `mappers/`, `primitives/` |
| Component file | PascalCase `.tsx` | `TodayCard.tsx` |
| Hook, types, api, mapper | lowercase `.ts` | `useDashboard.ts` |
| Component CSS | `style.css` | imported only in the `.tsx` |

Identifiers: components/types PascalCase; functions/hooks camelCase; constants `UPPER_SNAKE_CASE`. CSS class names: kebab-case is fine (DOM convention).

Imports **inside** a feature: relative paths (`../types`, `../todayCard`).  
Imports **from outside**: aliases (`@dashboard/dashboard`, `@components/button`, `@api`).

Aliases: `@api`, `@components/*`, `@dashboard` → `pages/home/dashboard/`, `@pages/*`, `@utils/*`.

## React / functions

- Pure mappers for data transforms (no I/O, no mutation)
- Thin hooks live under the feature `api/` folder (`api/useClients.ts`): fetch + state; mapping lives in `mappers/`. On GET failure expose `error` + `retry` and show `PageError`; empty data is for empty success. 404 stays a not-found empty state.
- Separate components, not `StatCard.Skeleton = …`
- No business logic in JSX or large `useEffect` blocks
- Fields that always move together = **one state object**, not N `useState`s

```ts
export function mapRecentWorkouts(workouts: Workout[]): RecentWorkout[] {
  return sortByNewest(workouts).map(toRecentWorkout);
}
```

## CSS

- One `style.css` per component folder, imported only in the `.tsx`
- One root block (`.today-card`); tokens `--bg`, `--accent`, `--surface`, `--border`, `--text`, `--text-h`
- **Token-only in components**: colors, spacing, radii, durations come from `src/styles/tokens.css` via `var(--…)` — no hex/`rgba()`/magic px in shared component CSS; no `var(--x, #fallback)` (tokens are always loaded)
- Mobile-first: `min-width` only (`fe/src/styles/layout.css`, `--bp-*`)
- Page width: `.page-container` / `--wide`, not copied `max-width`s
- Shell: sidebar at `64rem` (`--bp-lg`)
- Grids: `auto-fit` / `minmax` / `@container` on the feature

## Design system / Storybook

- Tokens live only in `src/styles/tokens.css` (imported by `index.css`); `layout.css` keeps breakpoints and page shell
- Every shared component has `Component.stories.tsx` next to its `.tsx` (CSF3, Italian copy, `tags: ["autodocs"]`)
- `npm run storybook` / `npm run build-storybook` (Node 22 locally); the preview loads the same CSS entries as the app
- Coach-only patterns shared across coach pages (e.g. `coachCard/`) live in `pages/coach/`, not in `components/`

## API

All requests go through `@api` (`apiRequest` + Zod). Shapes live in `api/schemas/`. No raw `fetch` in components.
