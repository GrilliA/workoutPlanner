# AGENTS.md

Rules for coding agents in this repo.

## Start Here

1. Read `WORKBOOK.md` before planning meaningful changes.
2. Update `WORKBOOK.md` when a decision, phase status, or notable change happens.
3. Keep diffs small. Reuse existing code before adding new helpers or packages.

## Project Shape

- `be/`: Express 5 + TypeScript + Drizzle ORM + Postgres.
- `fe/`: React 19 + Vite + Wouter + plain CSS.
- `docker-compose.yml`: local Postgres only.

## Commands

Backend:

```sh
cd be
npm run dev
npm run db:up
npm run db:generate
npm run db:migrate
```

Frontend:

```sh
cd fe
npm run dev
npm run build
npm run lint
```

## Conventions

- Backend routes live in `be/src/routes` and mount through `be/src/routes/index.ts`.
- Drizzle schema lives in `be/src/db/schema` and exports through `be/src/db/schema/index.ts`.
- Frontend pages live in `fe/src/pages`.
- Frontend route shells live in `fe/src/layouts` (camelCase folder names, e.g. `appLayout`).
- Frontend shared components live in `fe/src/components`.
- Use existing path aliases: `@components/*`, `@layouts/*`, `@pages/*`, `@utils/*`.
- Keep CSS colocated with the page/component that uses it.
- Do not edit `node_modules`, commit `.env`, or add dependencies without a clear reason.
- Prefer native browser features and existing installed packages over new libraries.

## Frontend Style

### CSS (default approach)

Follow the sidebar pattern for new UI:

- One colocated `.css` file per component/page, imported in its `index.tsx`.
- A single root block class on the wrapper (e.g. `.sidebar`, `.appLayout`).
- Nest child and state rules under that root with native CSS nesting (`& .item`, `&:hover`, `&.active`).
- Use short, local class names in JSX (`"item"`, `"item active"`) — not long BEM strings on every element.
- Prefer CSS variables from `index.css` for colors and shared tokens.

Example:

```css
.sidebar {
  display: flex;

  & .item {
    color: var(--text);

    &:hover {
      background-color: rgba(255, 255, 255, 0.08);
    }

    &.active {
      color: var(--accent);
    }
  }
}
```

Older components (e.g. button) may still use BEM-style classes; match the surrounding file when editing, use the nested root-block pattern for new work.

### Functional React

Prefer a functional style in the frontend:

- Named function exports (`export function Sidebar()`), not default exports for components.
- Keep static config as `const` data (e.g. nav items) and render with `.map()` instead of repeating JSX.
- Small, focused components; pass data in, return UI out.
- Use `@utils/cx` when class names depend on props or state.
- For reusable UI kits, use compound components (`Button.Root`, `Input.Field`) and primitives under a `primitives/` folder.

## Current MVP Bias

Build the smallest working workout planner:

1. Finish workout CRUD.
2. Add exercises per workout.
3. Wire the frontend to the API.
4. Add auth only when user-owned data is needed.
