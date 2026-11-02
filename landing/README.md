# Landing

Static Astro page for the Traccia waitlist. Italian copy, Sole theme, Plus Jakarta Sans self-hosted.

Needs Node.js 22.22 or newer.

```bash
cd landing
npm install
npm run dev       # http://localhost:4321/
npm run check
npm run build     # dist/ with base /
npm run build:pages  # dist/ with base /workoutPlanner/landing
```

`build:pages` is what GitHub Pages publishes. Local `dev` and `build` use `/` so assets work on localhost.

## Waitlist form

`PUBLIC_WAITLIST_ENDPOINT` is inlined at build time (see `.env.example`). An empty or missing value leaves `action="#"`, and the form shows the demo success state. The form still requires GDPR consent, sends the `company` honeypot, and copies `?ref=` into a hidden field. A real endpoint receives JSON and the page shows the API error text when the request fails.

Production target: `https://workoutplanner-production-974a.up.railway.app/api/waitlist`. The Pages workflow uses the repository variable `PUBLIC_WAITLIST_ENDPOINT` when it is set, and that Railway URL otherwise. The handler lives in [`be/src/waitlist`](../be/src/waitlist/README.md).

## Published URLs

The coach panel and this page share one GitHub Pages site:

- App: https://grillia.github.io/workoutPlanner/
- Landing: https://grillia.github.io/workoutPlanner/landing/

Design notes from the prototype: `PLAN.md`, `APP-STYLE.md`.
