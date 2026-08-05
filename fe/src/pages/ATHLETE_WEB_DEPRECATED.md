# Athlete web UI — removed

Since the 2026-07-27 coach pivot, **web (`fe/`) is coach-only**. Athletes use **mobile** (`mobile/`) for execute/log flows.

Deprecated athlete pages (`home/`, `sessions/`, `stats/`, `sessionhistory/`, athlete `workouts` list/edit) and Capacitor-era `NativeBootstrap` were deleted. `App.tsx` routes only: landing (`/`), auth, coach dashboard/clients/templates/assignments, and settings.

## Still in use (coach reuses the workout builder)

| Folder | Used by |
| --- | --- |
| `workouts/new/**` | Coach template create/edit, client program edit, TXT assign input types |

Coach imports: `CreateWorkout`, `DraftWorkoutDay`, `Weekday` from `@pages/workouts/new/*`.

Do not reintroduce athlete execute/log UI under `fe/src/pages/`.
