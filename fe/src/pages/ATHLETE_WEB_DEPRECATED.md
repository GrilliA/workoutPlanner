# Athlete web UI — deprecated (not routed)

Since the 2026-07-27 coach pivot, **web (`fe/`) is coach-only**. Athletes use **mobile** (`mobile/`) for execute/log flows.

`App.tsx` routes only: landing (`/`), auth, coach dashboard/clients/templates/assignments, and settings.

## Deprecated folders (no routes — safe to delete in a follow-up PR)

| Folder | Former purpose |
| --- | --- |
| `home/` | TRACCIA athlete dashboard (`/`) |
| `sessions/` | Active workout + session recap |
| `stats/` | Progressi / analytics |
| `sessionhistory/` | Paginated session history |
| `workouts/index.tsx`, `workouts/list/`, `workouts/edit/` | Athlete workout list + edit |

## Still in use (coach reuses the workout builder)

| Folder | Used by |
| --- | --- |
| `workouts/new/**` | Coach template create/edit, client program edit, TXT assign input types |

Coach imports: `CreateWorkout`, `DraftWorkoutDay`, `Weekday` from `@pages/workouts/new/*`.

## Residual cross-imports (harmless for now)

- `App.tsx` → `NativeBootstrap` → `sessions/active/resttimer/restTimerService` (Capacitor-era no-op on web)
- Orphaned `home/dashboard/todaycard` still references `sessions/active/api` internally

Do not add new imports from deprecated folders into coach or `App.tsx`.
