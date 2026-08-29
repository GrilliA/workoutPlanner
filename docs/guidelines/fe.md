# Frontend web (`fe/`)

React + Vite. UI copy is **Italian**. Style: functions, immutable data, pure mappers.

A feature (e.g. dashboard) lives **under its page**, not in `components/`. `components/` is shared UI primitives only (`button/`, `input/`, `card/`, `skeleton/`, `appShell/`).

```
pages/home/
├── index.tsx              # layout only: AppShell + feature
└── dashboard/             # the whole feature
    ├── api/
    │   └── useDashboard.ts  # GET + loading; on error use empty data
    ├── types.ts
    ├── mappers/mapDashboard.ts
    ├── dashboard/
    └── todayCard/
```

`pages/home/index.tsx` has no business logic.

## Folders and files

**Component folders** are camelCase, matching the React file: `errorBoundary/ErrorBoundary.tsx`, `appShell/AppShell.tsx`.  
**Non-component folders** stay lowercase: `mappers/`, `primitives/`, `context/`, `schemas/`.  
**Route segments** stay lowercase: `pages/coach/clients/`.  
No kebab-case. No PascalCase folders (`ErrorBoundary/` is wrong). Single-word names stay as they are (`button/`, `card/`, `toast/`).

Existing **page** feature folders (`coachpageheader/`, `athletestable/`, …) still use concatenated lowercase. Leave them until a dedicated rename; do not mix that into unrelated work.

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
- Thin hooks live under the feature `api/` folder (`api/useClients.ts`): fetch + state; mapping lives in `mappers/`. On GET failure return empty data (array/`null`), do not block the page.
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
- Mobile-first: `min-width` only (`fe/src/styles/layout.css`, `--bp-*`)
- Page width: `.page-container` / `--wide`, not copied `max-width`s
- Shell: sidebar at `64rem` (`--bp-lg`)
- Grids: `auto-fit` / `minmax` / `@container` on the feature

## API

All requests go through `@api` (`apiRequest` + Zod). Shapes live in `api/schemas/`. No raw `fetch` in components.
