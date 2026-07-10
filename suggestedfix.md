# suggestedfix.md

Backlog di fix e miglioramenti emersi dalla review (luglio 2026).  
Le priorità **alte** (P1 auth desync, P2 logout shell) sono state implementate.

Per ogni voce: **cosa**, **come**, **perché**.

---

## Media priorità

### P6 — Setting row con chevron ingannevole

**Cosa**  
In `/workouts/new`, le righe impostazioni mostrano un chevron come nel Figma, ma al tap **ciclano** l’opzione invece di aprire un picker/sotto-schermata.

**Come**  
- Opzione A: sostituire il tap-cycle con un bottom sheet / select nativo per `Recupero`, `Tipo scheda`, `Frequenza`.  
- Opzione B: rimuovere il chevron e usare un controllo esplicito (segmented control o `<select>` stilizzato).  
- File: `fe/src/pages/workouts/new/workoutsettings/`.

**Perché**  
Il chevron comunica navigazione; il comportamento attuale è sorprendente e non fedele al prototipo.

---

### W2 — Lista esercizi nel create workout

**Cosa**  
Manca la sezione `ESERCIZI (n)` con righe numerate, delete e CTA “Aggiungi esercizio”.

**Come**  
- Componenti: `exerciserow/`, `exerciselist/`, `addexercisebutton/`.  
- Draft locale in `useCreateWorkout`; al SALVA: `createWorkout` poi `createExercise` per ogni riga.  
- Backend già pronto: `POST /workouts/:id/exercises`.

**Perché**  
Senza esercizi la scheda è solo un nome; il flusso Figma e il valore per l’utente partono dalla lista.

---

### D2 — Costanti settings duplicate BE/FE

**Cosa**  
`REST_SEC_OPTIONS`, `WORKOUT_TYPE_OPTIONS`, `FREQUENCY_OPTIONS` esistono in:
- `be/src/services/workoutValidation.ts`
- `fe/src/api/schemas/workout.ts`

**Come**  
- **Source of truth = backend**: endpoint `GET /api/workouts/options` che restituisce le opzioni; FE le carica una volta.  
- Oppure package condiviso `shared/workoutSettings.ts` importato da be e fe (più setup).  
- Minimo: commento in entrambi i file che punta all’altro + test che verifica parità.

**Perché**  
Aggiungere un valore solo da un lato causa 400 silenziosi o UI che invia dati rifiutati dall’API.

---

### P9 — `userName` hardcoded in dashboard

**Cosa**  
`mapDashboard.ts` usa ancora `"Marco"` invece dell’utente da `useAuth` / `GET /me`.

**Come**  
- In `useDashboard` o `Dashboard.tsx`: leggere `user.name ?? user.email` da `useAuth()`.  
- Passare `userName` al mapper o al `TopBar` direttamente.  
- Rimuovere il placeholder da `createEmptyDashboardData`.

**Perché**  
Dopo il login l’UI mostra un nome falso; chunk A9 della roadmap auth.

---

### Allineamento nav AppShell ↔ Figma

**Cosa**  
Figma: `HOME | WORKOUT | TIMER | PROGRESSI | PROFILO` + sidebar “Crea Scheda”.  
Noi: `Home | Workout | Stats | Profilo`; nessun Timer; `/workouts` non punta a create/list.

**Come**  
- Rinominare label (italiano coerente con TRACCIA).  
- Aggiungere route placeholder `/timer` o nascondere finché non esiste.  
- Link “Crea Scheda” in sidebar → `/workouts/new`.  
- Bottom nav “Workout” → lista schede o create (decidere UX).

**Perché**  
Nav incoerente con il design approvato e con le feature in arrivo.

---

### P7 — Submit form con Invio su create workout

**Cosa**  
`/workouts/new` salva solo dal bottone header `SALVA`, non con Invio nel campo nome.

**Come**  
- Avvolgere i campi in `<form onSubmit={...}>`; `PageHeader` riceve `type="submit"` sul bottone SALVA o un `form id` con `form="..."`.

**Perché**  
Comportamento standard dei form; migliora accessibilità e velocità d’uso.

---

## Bassa priorità

### D1 — Slug in DB invece di label italiane

**Cosa**  
`workout_type` e `frequency` sono stringhe display (`"Forza + Ipertrofia"`, `"3× a settimana"`).

**Come**  
- DB: `workout_type` → enum/slug (`force_hypertrophy`, `3x_week`).  
- FE: mappa slug → label italiana.  
- Migration: convertire righe esistenti.

**Perché**  
i18n futura, query più stabili, niente problemi con caratteri `×` / encoding.

---

### D3 — `restSec` per esercizio

**Cosa**  
Figma mostra recupero per esercizio (`120s`, `90s`); oggi c’è solo `defaultRestSec` sulla scheda.

**Come**  
- Colonna `rest_sec` su `exercises` (nullable, fallback al default workout).  
- UI in `ExerciseRow` quando arriva W2.

**Perché**  
Il default workout non basta per schede miste petto/legs con recuperi diversi.

---

### P4 — PATCH/DELETE workout

**Cosa**  
Non si può modificare o eliminare una scheda dopo la creazione.

**Come**  
- `PATCH /api/workouts/:id`, `DELETE /api/workouts/:id` con ownership check.  
- FE: schermata edit o swipe-delete in lista.

**Perché**  
CRUD incompleto; errori di battitura nel nome richiedono workaround.

---

### P8 — Persistenza bozza locale

**Cosa**  
Refresh o crash durante la compilazione perde il draft.

**Come**  
- `sessionStorage` keyed per user id con draft `{ name, settings, exercises }`.  
- Clear on successful save.

**Perché**  
Nice-to-have; utile quando il form diventa lungo (W2+).

---

### I1 — Copy login mista IT/EN

**Cosa**  
Login in inglese, register con link italiano, dashboard in italiano.

**Come**  
Pass unico su `pages/login`, `pages/register`, messaggi errore API (o mappa errori BE → IT).

**Perché**  
Coerenza con AGENTS.md (“UI copy in Italian”).

---

### I2 — Loading state in `RequireAuth`

**Cosa**  
Durante bootstrap auth la route protetta renderizza `null` (schermo vuoto).

**Come**  
- `RequireAuth` mostra `Skeleton` o spinner full-page.  
- Opzionale: stesso pattern su login/register durante `status === "loading"`.

**Perché**  
Flash bianco percepito come bug al reload.

---

### I3 — Route `/forgot-password`

**Cosa**  
Link presente in login, route e backend (A7) non implementati.

**Come**  
Chunk A7–A8: endpoint forgot/reset + pagina reset; token in log in dev.

**Perché**  
Link morto = UX rotta.

---

### P3 — Bootstrap auth vs errori di rete

**Cosa**  
`bootstrapSession` tratta errore di rete come “non autenticato”.

**Come**  
- Stato `status: "error"` con retry in `AuthProvider`.  
- `RequireAuth` mostra banner “Impossibile verificare la sessione” invece di redirect a login.

**Perché**  
Utente loggato con rete instabile finisce su login senza motivo chiaro.

---

### P10 — “Oggi” = workout più recente

**Cosa**  
`TodayCard` mostra sempre la scheda più nuova, non quella pianificata per oggi.

**Come**  
- Quando esiste scheduling (nuove colonne o tabella `planned_sessions`), mapper dedicato.  
- Fino ad allora: rinominare copy (“ULTIMA SCHEDA”) o empty state più onesto.

**Perché**  
Label “OGGI” è semanticamente scorretta con più schede.

---

### P11 — Stats placeholder fino a B2/B3

**Cosa**  
Stat grid e workout row mostrano 0 / placeholder quando non ci sono sessioni loggate.

**Come**  
- Già parzialmente coperto da C5 empty states; estendere a tutti i casi.  
- Oppure nascondere la stat grid finché B3 non è pronto.

**Perché**  
Evitare numeri fuorvianti (es. volume 0 come se fosse reale).

---

## Processo / repo

### R1 — Aggiornare `WORKBOOK.md`

**Cosa**  
Roadmap non riflette auth (A1–A6), create workout, settings backend.

**Come**  
Aggiungere chunk A* e W* con stato ✅/⬜; spostare voci completate in “What we did”.

**Perché**  
Contesto per agenti e contributor; evita lavoro duplicato.

---

### R2 — Migration files al posto di solo `db:push`

**Cosa**  
Schema applicato con `drizzle-kit push --force`; cartella `be/drizzle/` vuota.

**Come**  
- `npm run db:generate` dopo stabilizzazione schema.  
- CI: `db:migrate` in deploy.  
- Documentare in `AGENTS.md`.

**Perché**  
`push` in produzione è rischioso e non versionato.

---

### R3 — Test automatici auth + workouts

**Cosa**  
Nessun test; `npm test` è placeholder.

**Come**  
- BE: supertest su register/login/refresh/workouts con DB test.  
- FE: test su `workoutValidation` parity e `createWorkoutRequestSchema`.

**Perché**  
Regressioni su auth e Zod sono costose da beccare a mano.

---

### R5 — Rate limiting login/register

**Cosa**  
Nessun limite tentativi su `/auth/login` e `/auth/register`.

**Come**  
Middleware `express-rate-limit` su router auth; IP + email throttling.

**Perché**  
Prerequisito ragionevole prima di esporre l’API pubblicamente.

---

## Ordine consigliato (dopo fix alti)

1. W2 — esercizi nel create  
2. P9 — nome utente reale  
3. P6 — picker impostazioni  
4. Allineamento nav Figma  
5. D2 — costanti unificate  
6. Resto in base al bisogno prodotto
