# M3 — Mobile semplice

Obiettivo: app atleta molto più semplice e user friendly. Riferimenti: nuova app Banco Guayaquil (una sola azione principale per schermata) e stati vuoti di Telegram (mascotte animata al centro, titolo breve, una riga, un bottone).

Mockup approvato: [`docs/mockups/mobile-simple.html`](../mockups/mobile-simple.html) (aprire nel browser). È la fonte di verità visiva.

## Decisioni

| Tema | Decisione |
| --- | --- |
| Dati Home | Nuovo endpoint aggregato `GET /athlete/home`: una chiamata al posto delle ~14 attuali |
| Badge "scheda nuova" | Colonna `program_assignments.seen_at` + `POST /assignments/active/seen` |
| Tab bar | `NativeTabs` di `expo-router/unstable-native-tabs` (vetro nativo iOS 26, Material su Android) |
| Stati vuoti | Lottie (`lottie-react-native`), animazioni gratuite da LottieFiles (Lottie Simple License), fonte annotata |
| Architettura mobile | A feature: route sottili, logica in `src/features/<feature>/`, mapper puri con test |
| Feature Account | Cartella `src/features/settings` (coincide con la route `settings.tsx`) |
| Copy | Italiano, bottoni in sentence case (niente MAIUSCOLO), aree tappabili ≥ 48px |

## Backend

### `GET /athlete/home`

In `be/src/routes/athlete.ts` (già `requireAuth` + `requireRole("athlete")`). Route sottile: query DB, poi funzione pura `buildAthleteHome(...)` in `be/src/services/athleteHome.ts`, con test unitari in `athleteHome.test.ts` (eseguiti da `npm test`, senza DB).

Contratto (inglese, come il resto dell'API):

```ts
{
  noProgramReason: "no-coach" | "coach-pending" | "coach-program-inactive" | null,
  programs: Array<{
    workoutId: number;
    name: string;
    source: "coach" | "self";
    expiresAt: string | null;          // YYYY-MM-DD, solo per source "coach"
    days: Array<{ id: number; name: string; weekdays: number[]; exerciseCount: number }>;
  }>,
  today: { date: string; workoutId: number; workoutDayId: number; workoutDayName: string } | null,
  week: Array<{ date: string; weekday: number; workoutDayId: number | null; workoutDayName: string | null }>, // 7 voci lun→dom
  nextWorkout: { date: string; workoutDayName: string } | null,
  sessionsLast7Days: number,
  lastSession: { sessionId: number; workoutDayName: string | null; completedAt: string; volumeKg: number } | null,
  hasUnseenAssignment: boolean,
}
```

Regole (portate dal mobile, devono restare identiche):
- `programs`: se c'è un'assegnazione coach attiva → solo quella scheda; altrimenti le schede `isActive` con `createdByUserId == null || createdByUserId === userId`, ordinate per `createdAt` desc. Fonte attuale: `mobile/app/(app)/index.tsx` (load) e `mobile/src/features/home/mappers/resolveNoProgramReason.ts`.
- `noProgramReason`: valorizzato solo se `programs` è vuoto; stessa logica di `resolveNoProgramReason`.
- `today`: prima scheda di `programs` per cui `resolveWorkoutDayForDate` (in `services/workoutDayAccess.ts`, include override e default a giorno unico) restituisce un giorno. Fuso Europe/Rome (`services/workoutSchedule.ts`).
- `week`: settimana lun→dom corrente (Rome) della scheda di `today`, o della prima scheda se `today` è null; stessa risoluzione di `today` per ogni data.
- `nextWorkout`: solo se `today` è null; primo giorno con allenamento nei 7 giorni successivi.
- `sessionsLast7Days`: sessioni completate negli ultimi 7 giorni (stessa finestra di `workoutsPerWeek` in `services/stats.ts`). Copy UI: "N allenamenti negli ultimi 7 giorni".
- `lastSession`: ultima sessione completata; `workoutDayName` da `workout_sessions.workoutDayId` (null se il giorno è stato cancellato); `volumeKg` come in `services/stats.ts`.

Test minimi: coach con assegnazione attiva; solo schede self; nessun coach; coach senza scheda; scheda coach inattiva; oggi riposo con `nextWorkout`; nessuna sessione; override che cambia il giorno di oggi.

### Badge `seen_at`

- Migrazione con `npm run db:generate` (NON `db:push`: vedi drift in WORKBOOK 2026-09-08): colonna `seen_at timestamp null` su `program_assignments`.
- `POST /assignments/active/seen` (in `routes/assignments.ts`): imposta `seen_at = now()` sull'assegnazione attiva dell'atleta; 404 se non c'è; idempotente.
- `hasUnseenAssignment` = assegnazione attiva con `seen_at` null.
- Vincolo futuro (P2 revisioni): quando l'assegnazione viene retargettata su una revisione, azzerare `seen_at`.

## Mobile — architettura a feature

```
app/(app)/_layout.tsx      NativeTabs + badge su "Schede"
app/(app)/index.tsx        <HomeScreen />
app/(app)/workouts.tsx     <WorkoutsScreen />
app/(app)/stats.tsx        <ProgressScreen />
app/(app)/settings.tsx     <SettingsScreen />  + settings/coach.tsx, settings/profile.tsx, settings/password.tsx
src/components/            + emptystate/, bottomsheet/
src/features/home/         HomeScreen, useHomeData, mappers/, todaycard/, changeworkoutsheet/, weekstrip/, recentrow/
src/features/workouts/     WorkoutsScreen, activeprogramcard/, workoutrow/
src/features/stats/        esistente, semplificato
src/features/settings/     SettingsScreen + sotto-schermate
```

Regole:
- Le route importano solo la schermata della feature.
- Una feature non importa da un'altra feature; ciò che è condiviso va in `src/components` o `src/utils`.
- Logica derivata in mapper puri con test (`cd mobile && ../be/node_modules/.bin/tsx --test <file>.test.ts`).
- Niente `useCallback`/`useMemo` di default (vedi `docs/guidelines/fe.md`), niente libreria di cache.
- Nomi nuovi non elencati qui: proporre 2–3 opzioni prima (vedi `docs/guidelines/agents.md`).

## Chunk e ondate

Ogni chunk = un branch + una PR verso `main`. Il merge lo fa il proprietario del repo; un'ondata parte dopo il merge della precedente.

| Ondata | Chunk | Branch | Contenuto |
| --- | --- | --- | --- |
| 1 | M3a | `feat/M3a-athlete-home-endpoint` | `GET /athlete/home` + `seen_at` + `POST /assignments/active/seen` + test; schema Zod mobile + `getAthleteHome()` / `markAssignmentSeen()` in `mobile/src/api` |
| 1 | M3b | `feat/M3b-mobile-ui-foundation` | `lottie-react-native` + 4 animazioni (saluto, attesa, dorme, taccuino), `EmptyState`, `BottomSheet`, `NativeTabs` in `_layout.tsx` (badge cablato a una prop, dati in M3d) |
| 2 | M3c | `feat/M3c-home-simple` | Home su `/athlete/home`: card Oggi con un solo bottone, sheet "Cambia allenamento", stati vuoti (3 motivi + riposo), riga riepilogo, ultimo allenamento |
| 3 | M3d | `feat/M3d-workouts-simple` | Tab Schede: card "In uso" con menu ⋯ (annulla programma coach), righe giorni, "Le mie schede", `markAssignmentSeen` al focus, badge |
| 3 | M3e | `feat/M3e-stats-simple` | Progressi: numero grande, grafico, 2 chip, stato vuoto |
| 3 | M3f | `feat/M3f-settings-rows` | Account a righe stile Telegram + 3 sotto-route |
| 4 | M3g | — | E2E su Devin Cloud: API + Postgres + app Expo web con Playwright. iOS simulator verificato in locale |

## Verifica per chunk

- `be`: `npx tsc --noEmit` + `npm test`; per M3a anche `npm run db:migrate` su DB pulito + `npm run test:e2e`.
- `mobile`: `npm run typecheck` + test dei mapper toccati.
- UI: screenshot di ogni schermata/stato toccato su Expo web, confrontati con il mockup, allegati alla PR.

## Da verificare (ipotesi, non fatti)

- `NativeTabs` su Expo **web**: se non supportato, serve un fallback a `Tabs` JS solo su web. Da verificare in M3b.
- Supporto badge di `NativeTabs` nella versione installata (Expo SDK 57). Da verificare in M3b.
- `lottie-react-native` su Expo web (richiede `@lottiefiles/dotlottie-react` o simile?). Da verificare in M3b.

## Fuori scope

- Riprendere una sessione in corso dalla Home (resta l'alert attuale all'avvio).
- Schermata sessione, builder scheda, pannello coach web.
