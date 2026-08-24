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
  <img src="docs/screenshots/ios-login.png" width="240" alt="Athlete login" />
  <img src="docs/screenshots/ios-home.png" width="240" alt="Athlete home" />
  <img src="docs/screenshots/ios-workouts.png" width="240" alt="Athlete programs" />
  <img src="docs/screenshots/ios-progress.png" width="240" alt="Athlete progress" />
</p>

## Stack

| | |
| --- | --- |
| Web | React + Vite + TypeScript |
| Mobile | Expo + React Native + TypeScript |
| API | Express + Drizzle + Postgres |

## Dev

```bash
npm run db:up          # Postgres
cd be && npm run dev   # API :3005
cd fe && npm run dev   # Web :5173
cd mobile && npm start # Expo (i for iOS)
```

See [`AGENTS.md`](AGENTS.md) for details.
