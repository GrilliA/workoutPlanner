# Contratto — Scheda del coach in arrivo

Stato: **in review** (2026-11-05). Cambia un contratto pubblico (`GET /athlete/home`) in modo additivo.

## Problema

Una scheda assegnata con `startsAt` futuro viene salvata come `scheduled` e il workout con `isActive = false`. `GET /athlete/home` legge solo l'assegnazione attiva (`startsAt ≤ oggi ≤ expiresAt`), quindi l'atleta non la vedeva e la Home diceva "La scheda del coach è in pausa".

## Regole

- Una sola route cambia: `GET /api/athlete/home`, dietro `requireAuth` + `requireRole("athlete")` come oggi.
- **Additivo**: i campi di oggi restano identici; si aggiunge `upcomingProgram`.
- `noProgramReason` resta `"coach-program-inactive"` quando c'è solo la scheda in arrivo: l'app in produzione valida l'enum con Zod e un valore nuovo la romperebbe. L'app nuova guarda prima `upcomingProgram`.
- `upcomingProgram` = la prima assegnazione non revocata con `startsAt > oggi` (Roma), per `startsAt` crescente, poi `id` decrescente. `coachName` è il nome del coach che l'ha assegnata (può essere `null`).
- Nessun cambio ai permessi: l'atleta legge già il workout (`GET /workouts/:id`, giorni ed esercizi) e `POST /workouts/:id/sessions` risponde ancora 409 finché il workout non è attivo.
- `hasUnseenAssignment` non cambia (resta legato alla scheda attiva).

## Dopo

```json
{
  "noProgramReason": "coach-program-inactive",
  "programs": [],
  "upcomingProgram": {
    "workoutId": 31,
    "name": "Upper Lower",
    "startsAt": "2026-11-09",
    "expiresAt": "2026-12-06",
    "coachName": "Sofia Ricci",
    "days": [{ "id": 101, "name": "Upper", "weekdays": [0], "exerciseCount": 5 }]
  }
}
```

`days` ha la stessa forma di `programs[].days`. Con una scheda attiva, `programs` è quello di oggi e `upcomingProgram` indica la successiva.

## Client

- Mobile (`mobile/src/api/schemas/athletehome.ts`): `upcomingProgram` `nullable().default(null)`. Home: card "Scheda in arrivo" se `programs` è vuoto, banner sopra la settimana se c'è già una scheda in uso. Tap → `/workout/[workoutId]?startsAt=…&dayId=…` in sola lettura.
- Web coach: nessun cambio (la route è solo atleta).
