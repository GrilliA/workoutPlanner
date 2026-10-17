# traccia

Coach panel on the web + athlete app on iOS/Android. Programs, sessions, and analytics.

<p align="center">
  <img src="docs/screenshots/web-dashboard.png" alt="Coach dashboard" />
</p>

## Coach (web)

Assign programs, build workouts, follow clients, and check analytics.

<p align="center">
  <img src="docs/screenshots/web-login.png" alt="Coach login" width="48%" />
  <img src="docs/screenshots/web-analytics.png" alt="Coach analytics" width="48%" />
</p>

<p align="center">
  <img src="docs/screenshots/web-clients.png" alt="Clients" width="48%" />
  <img src="docs/screenshots/web-create-workout.png" alt="Create workout" width="48%" />
</p>

## Athlete (mobile)

Open today’s program, start the workout, log sets, track progress.

<p align="center">
  <img src="docs/screenshots/mobile-home.png" width="240" alt="Athlete home" />
  <img src="docs/screenshots/mobile-session.png" width="240" alt="Workout, one set at a time" />
  <img src="docs/screenshots/mobile-complete.png" width="240" alt="Workout done" />
</p>

<p align="center">
  <img src="docs/screenshots/mobile-progress.png" width="240" alt="Athlete progress" />
  <img src="docs/screenshots/mobile-workouts.png" width="240" alt="Athlete programs" />
  <img src="docs/screenshots/mobile-login.png" width="240" alt="Athlete login" />
</p>

Screenshots of the "Sole" design (M4), rendered from the Expo web build and the coach panel with sample data.

## Stack

| | |
| --- | --- |
| Web | React + Vite + TypeScript |
| Mobile | Expo + React Native + TypeScript |
| API | Express + Drizzle + Postgres |
| Landing | Astro (static waitlist) |

## Dev

```bash
npm run db:up          # Postgres
cd be && npm run dev   # API :3005
cd fe && npm run dev   # Web :5173
cd mobile && npm start # Expo (i for iOS)
cd landing && npm run dev  # Waitlist :4321
```

## GitHub Pages

One site, two paths. The coach panel stays where it is; the waitlist is a subpath.

- App: https://grillia.github.io/workoutPlanner/
- Landing: https://grillia.github.io/workoutPlanner/landing/

The waitlist form uses the repository variable `PUBLIC_WAITLIST_ENDPOINT` at build time. Until that variable is set, the form shows a demo success state. See [`landing/README.md`](landing/README.md).

See [`AGENTS.md`](AGENTS.md) for details.
