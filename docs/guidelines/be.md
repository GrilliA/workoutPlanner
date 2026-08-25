# Backend (`be/`)

Express + Drizzle + Postgres.

- Route handlers may have side effects (DB, HTTP); keep them **thin**
- Validation and query building: pure helpers where it helps readability
- Files are **lowercase**: `routes/workouts.ts`, `routes/exercises.ts`
- Dev credentials in `be/.env`: `postgres:postgres` (must match `docker-compose.yml`)
