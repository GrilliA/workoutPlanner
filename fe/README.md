# Frontend web (coach)

React + Vite + TypeScript client for coaches. Talks to the Express API via relative `/api/...` URLs.

## Dev

```bash
# From repo root: Postgres + backend first (see AGENTS.md)
cd be && npm run dev   # :3005

cd fe && npm run dev   # Vite; proxies /api → http://localhost:3005
```

Proxy is configured in `vite.config.ts`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b` + production bundle |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

Conventions, layout, and path aliases: [`../AGENTS.md`](../AGENTS.md).
