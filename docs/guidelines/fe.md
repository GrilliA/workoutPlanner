# Frontend web (`fe/`)

React + Vite. UI copy is **Italian**. Style: functions, immutable data, pure mappers.

A feature (e.g. dashboard) lives **under its page**, not in `components/`. `components/` is shared UI primitives only (`button/`, `input/`, `card/`, `skeleton/`, `appshell/`).

```
pages/home/
├── index.tsx              # layout only: AppShell + feature
└── dashboard/             # the whole feature
    ├── api.ts
    ├── useDashboard.ts
    ├── types.ts
    ├── mappers/mapDashboard.ts
    ├── dashboard/
    └── todaycard/
```

`pages/home/index.tsx` has no business logic.

## Folders and files

All **folders** are lowercase (including component folders). No PascalCase or kebab-case in paths.

```
todaycard/
├── TodayCard.tsx    # only the React file is PascalCase
├── style.css
└── index.tsx        # public API
```

| Kind | Naming | Example |
| --- | --- | --- |
| Folder | lowercase | `todaycard/`, `mappers/` |
| Component file | PascalCase `.tsx` | `TodayCard.tsx` |
| Hook, types, api, mapper | lowercase `.ts` | `useDashboard.ts` |
| Component CSS | `style.css` | imported only in the `.tsx` |

Identifiers: components/types PascalCase; functions/hooks camelCase; constants `UPPER_SNAKE_CASE`. CSS class names: kebab-case is fine (DOM convention).

Imports **inside** a feature: relative paths (`../types`, `../todaycard`).  
Imports **from outside**: aliases (`@dashboard/dashboard`, `@components/button`, `@api`).

Aliases: `@api`, `@components/*`, `@dashboard` → `pages/home/dashboard/`, `@pages/*`, `@utils/*`.

## React / functions

- Pure mappers for data transforms (no I/O, no mutation)
- Thin hooks: fetch + state; mapping lives in `mappers/`
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
