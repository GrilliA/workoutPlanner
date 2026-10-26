# Contratto R4 — Tabella Clienti (stato abbonamento, frequenza, filtri)

Stato: **approvato il 2026-10-26** (Contract Gate di R4). Cambia un contratto pubblico (`GET /coach/clients`) in modo additivo.
Piano: [`docs/plans/PT-registro.md`](../plans/PT-registro.md), riga R4. Contratto R2 di riferimento: [`pt-registro.md`](pt-registro.md) (stato abbonamento, pausa attiva).

I punti segnati con **(D1)** … **(D8)** rimandano alle [decisioni prese](#decisioni-prese): l'utente ha scelto l'opzione A ovunque tranne D2 (opzione C).

## Regole comuni

- Una sola route cambia: `GET /api/coach/clients`, dietro `requireAuth` + `requireRole("coach")` come oggi (401 / 403 invariati).
- **Additivo**: i cinque campi di oggi restano identici per nome, tipo e ordine delle righe; si aggiungono tre campi per riga. Nessun query param nuovo: i filtri vivono nel client.
- Nessun errore nuovo: la route non ha input. Nessuna paginazione: un coach ha qualche decina di clienti.
- Restano **invariate**: `GET /coach/clients/:athleteId` (il suo `client` non riceve i campi nuovi) e `GET /coach/analytics/clients/:athleteId` (stesso `client`). Il dettaglio ha già la tab Abbonamento (R3).
- La GET non scrive: lo stato della scheda si calcola dalle date, **non** chiama `syncAssignmentStatusesForCoach` (che aggiorna righe) e non legge `program_assignments.status` se non per escludere `revoked`.
- "Oggi" è `todayInRome()`. Date `YYYY-MM-DD` di calendario di Roma.
- Solo i clienti **collegati** (`coach_athletes`) del coach autenticato, come oggi. Gli ex clienti con abbonamento chiuso non compaiono (restano raggiungibili da `GET .../subscription` e da Business in R8).

## Prima / dopo

Oggi (`listCoachAthletes`, `be/src/services/coachAthleteAccess.ts`):

```json
[
  { "id": 42, "email": "giulia@example.com", "name": "Giulia Rossi", "createdAt": "2026-03-02T10:11:12.000Z", "linkedAt": "2026-09-17T08:00:00.000Z" }
]
```

Dopo:

```json
[
  {
    "id": 42,
    "email": "giulia@example.com",
    "name": "Giulia Rossi",
    "createdAt": "2026-03-02T10:11:12.000Z",
    "linkedAt": "2026-09-17T08:00:00.000Z",
    "subscription": { "status": "expiring", "paidThrough": "2026-10-30", "daysLeft": 4, "pausedUntil": null },
    "lastSessionOn": "2026-10-24",
    "last14Days": { "completedSessions": 5, "expectedSessions": 6 }
  },
  {
    "id": 57,
    "email": "marco@example.com",
    "name": null,
    "createdAt": "2026-10-20T09:00:00.000Z",
    "linkedAt": "2026-10-21T09:00:00.000Z",
    "subscription": null,
    "lastSessionOn": null,
    "last14Days": { "completedSessions": 0, "expectedSessions": null }
  }
]
```

## Tipi di risposta

```ts
type SubscriptionStatus = "active" | "expiring" | "expired" | "paused" | "ended"; // come R2

type CoachClientListItem = {           // (D1) schema FE coachClientListItemSchema
  // invariati
  id: number;
  email: string;
  name: string | null;
  createdAt: string;                   // ISO timestamp
  linkedAt: string;                    // ISO timestamp
  // nuovi
  subscription: ClientSubscriptionSummary | null; // null = nessuna riga client_subscriptions per la coppia
  lastSessionOn: string | null;        // YYYY-MM-DD (Roma), null se nessuna sessione completata
  last14Days: TrainingFrequency;       // (D2) frequenza nella finestra di 14 giorni
};

type ClientSubscriptionSummary = {
  status: SubscriptionStatus;
  paidThrough: string;                 // YYYY-MM-DD, ultimo giorno pagato (incluso)
  daysLeft: number;                    // paidThrough − oggi, negativo se scaduto; presente anche con "paused" ed "ended"
  pausedUntil: string | null;          // endsOn della pausa in corso, solo con status "paused"
};

type TrainingFrequency = {
  completedSessions: number;           // intero ≥ 0
  expectedSessions: number | null;     // intero ≥ 2, null senza scheda attiva utilizzabile
};
```

`ClientSubscriptionSummary` è `SubscriptionState` di R2 più `paidThrough`, quindi stessi valori della tab Abbonamento per lo stesso cliente nello stesso giorno.

**Niente nome dell'offerta né prezzo.** La tabella mostra lo stato e la scadenza, non il listino; il nome si legge già da `GET /coach/offers` (include le archiviate) e il prezzo concordato dalla tab Abbonamento. Aggiungerli vorrebbe dire una join su `coach_offers` in più e soldi in una risposta che il pannello carica anche per la dashboard e per "Nuova assegnazione". Se R8 o la tabella ne avranno bisogno si aggiungono in modo additivo.

**Niente `endedOn`.** `status: "ended"` basta per la tabella; un `endedOn` futuro non cambia lo stato (regola R2) e il dettaglio lo mostra.

## Regole di calcolo

### `subscription`

Riga `client_subscriptions` della coppia `(coachId, athleteId)`; senza riga → `null`.

`subscriptionState({ paidThrough, endedOn, today, activePause })` di `be/src/services/subscription.ts`, invariata. `activePause` è la pausa con `cancelledAt IS NULL` e `endsOn >= oggi`; se per dati sporchi ce ne fossero più d'una vale quella con `startsOn` più recente, come `findActivePause` in `subscriptionAccess.ts`. Una pausa futura non dà `paused` (regola R2).

### `lastSessionOn`

Giorno di Roma (`toRomeDateKey`) del `completedAt` massimo tra le sessioni dell'atleta con `status = 'completed'` e `completedAt IS NOT NULL`. Contano tutte le sessioni dell'atleta, non solo quelle della scheda del coach (**D5**), come `loadLastSessionDate` e gli alert di oggi.

`workout_sessions.completed_at` è `timestamp` senza fuso e contiene l'istante UTC (Drizzle lo rilegge con `+0000`): la conversione al giorno di Roma si fa in TypeScript con `toRomeDateKey`, non in SQL.

### `last14Days` (regola condivisa con R5)

**Finestra**: 14 giorni di calendario di Roma, **oggi incluso**: da `oggi − 13` a `oggi`. Così una sessione fatta oggi conta subito, e "ultime 2 settimane" finisce dove finisce la scheda di oggi.

**`completedSessions`**: numero di sessioni con `status = 'completed'` il cui giorno di Roma di `completedAt` cade nella finestra. Escluse `in_progress` e `abandoned`. Conta le sessioni, non i giorni: due sessioni lo stesso giorno contano 2 (**D5**). Una sessione iniziata prima della finestra e completata dentro conta (vale il giorno di completamento).

**Scheda attiva**: riga `program_assignments` con

- `coach_id` = coach autenticato e `athlete_id` = cliente;
- `status <> 'revoked'`;
- `starts_at <= oggi <= expires_at` (lo stesso test di `computeAssignmentStatus` = `"active"`; lo `status` salvato non si usa perché si aggiorna solo con la sincronizzazione).

Una scheda programmata (inizia dopo oggi) o scaduta non è attiva. Il passaggio di scheda (`planAssignmentCutover`) tronca o revoca le altre, quindi di norma ce n'è al massimo una; se ce ne fossero più d'una conta quella con `id` più alto, come `getActiveAssignmentForAthlete` e `loadActiveProgramExpiry`. Le schede non si sommano.

**Giorni della scheda**: numero di righe `workout_days` con `workout_id = assignment.workout_id` (**D4**). Non si usano `workouts.frequency` (testo libero, es. `"3× a settimana"`) né i giorni della settimana di `workout_day_weekdays` (facoltativi).

**`expectedSessions`** = giorni della scheda × 2 (le settimane della finestra). `null` se non c'è scheda attiva **oppure** se la scheda attiva ha 0 giorni (un'attesa di 0 renderebbe il rapporto di R5 privo di senso). Nessuna proporzione se la scheda è iniziata dentro la finestra (**D6**).

La finestra non tiene conto di pause né dello stato dell'abbonamento: i conteggi sono grezzi, R5 decide cosa farne (il piano toglie i clienti in pausa dal rischio).

### Funzione pura (**D3**)

In `be/src/services/clientActivity.ts`, con test in `clientActivity.test.ts`:

```ts
/** Days of the window, today included. R5 reuses this rule for the drop-out risk. */
export const FREQUENCY_WINDOW_DAYS = 14;

export const trainingFrequency = (input: {
  completedOn: string[];            // giorni di Roma (YYYY-MM-DD) delle sessioni completate, uno per sessione
  workoutDayCount: number | null;   // giorni della scheda attiva, null senza scheda attiva
  today: string;
}): TrainingFrequency; // { completedSessions: number; expectedSessions: number | null }
```

`TrainingFrequency` è il tipo esportato da `clientActivity.ts` e corrisponde al campo `last14Days` della risposta.

- `completedSessions` = elementi di `completedOn` con `addRomeDays(today, −13) <= giorno <= today`.
- `expectedSessions` = `null` se `workoutDayCount` è `null` o `0`, altrimenti `workoutDayCount × FREQUENCY_WINDOW_DAYS / 7`.
- La conversione `Date → giorno di Roma` resta al bordo (accesso DB), così la funzione si testa con stringhe.

Test minimi: sessione oggi conta; sessione a `oggi − 13` conta, a `oggi − 14` no; sessione futura (orologio sfasato) non conta; due sessioni lo stesso giorno = 2; `workoutDayCount` `null` → `null`; `0` → `null`; `3` → `6`.

## Query (aggregate, numero fisso per richiesta)

L'accesso DB sta in una funzione nuova (**D3**: `listCoachClientRows(coachId, today)` in `coachAthleteAccess.ts`); `listCoachAthletes` resta com'è perché la usa anche `loadCoachAnalyticsOverview`. Cinque query indipendenti in `Promise.all`, ognuna filtrata dal collegamento del coach, poi unione in memoria per `athleteId`. Nessuna query per cliente.

| # | Cosa | Tabelle | Filtro | Indice esistente |
| --- | --- | --- | --- | --- |
| 1 | clienti (come oggi) | `coach_athletes` ⨝ `users` | `coach_athletes.coach_id = :coach` | unique `(coach_id, athlete_id)` di `coach_athletes`; PK `users` |
| 2 | abbonamenti | `client_subscriptions` ⨝ `coach_athletes` (stessa coppia) | `client_subscriptions.coach_id = :coach` | unique `client_subscriptions_coach_athlete (coach_id, athlete_id)` |
| 3 | pause vive | `subscription_pauses` ⨝ `client_subscriptions` | `client_subscriptions.coach_id = :coach`, `cancelled_at IS NULL`, `ends_on >= :today` | `subscription_pauses_subscription_id_idx` |
| 4 | sessioni completate | `workout_sessions` ⨝ `coach_athletes` (`athlete_id = user_id`) | `coach_id = :coach`, `status = 'completed'`, `completed_at IS NOT NULL`; `GROUP BY user_id` per `max(completed_at)` e righe `completed_at >= :windowLowerBound` per la finestra | **nessuno utile** (vedi D8) |
| 5 | scheda attiva + giorni | `program_assignments` ⟕ `workout_days` | `program_assignments.coach_id = :coach`, `status <> 'revoked'`, `starts_at <= :today`, `expires_at >= :today`; `GROUP BY program_assignments.id` con `count(workout_days.id)` | **nessuno** su `program_assignments.coach_id` né su `workout_days.workout_id` (vedi D8) |

Note:

- La query 4 può essere due statement (massimo storico; righe della finestra) oppure uno solo con `max(completed_at)` raggruppato e un secondo `SELECT user_id, completed_at` limitato. Quello che conta per il contratto: numero fisso di query e filtro per coach.
- `:windowLowerBound` è un limite largo in UTC: `Date.parse(addRomeDays(today, −14) + "T00:00:00Z")`. Roma è UTC+1/+2, quindi la mezzanotte di Roma di `oggi − 13` cade sempre dopo questo istante; il filtro esatto lo fa `trainingFrequency` sui giorni di Roma.
- La query 2 filtra per `coach_id`, quindi le righe di un coach precedente dello stesso atleta non escono; la join sul collegamento toglie quelle dei clienti scollegati da questo coach (la riga resta per Business, ma non è una riga della tabella).
- La query 5 è per coach, non per atleta: le schede di un coach precedente non contano.
- Costo: `GET /coach/clients` la chiamano anche la dashboard (`useDashboard`) e "Nuova assegnazione": pagano le query in più. È comunque meno di oggi in `loadCoachAnalyticsOverview`, che fa tre query per cliente.

Ordine delle righe: invariato (`users.name` crescente, poi `users.email`).

## Filtri nel client

Nessun query param al backend. La pagina Clienti legge `?stato=` dall'URL (link futuri da Oggi, R5) e lo riscrive quando il coach cambia filtro (`replace`, per non riempire la cronologia). Valore assente o sconosciuto → Tutti.

| Filtro (copy) | `?stato=` (**D7**) | Righe |
| --- | --- | --- |
| Tutti | assente | tutte |
| In scadenza | `in-scadenza` | `subscription.status === "expiring"` |
| Scaduti | `scaduti` | `subscription.status === "expired"` |
| In pausa | `in-pausa` | `subscription.status === "paused"` |
| Senza abbonamento | `senza-abbonamento` | `subscription === null` **oppure** `subscription.status === "ended"` (etichetta "Chiuso" sulla riga) |

- `active` compare solo in Tutti: il piano non prevede un filtro "In regola" e un cliente in regola non chiede azioni.
- `ended` per un cliente ancora collegato significa "abbonamento chiuso, da riprendere": per l'onboarding è come non averlo, quindi va in "Senza abbonamento"; la riga mostra comunque lo stato "Chiuso" per distinguerlo da chi non l'ha mai avuto.
- Il filtro è una funzione pura nel client (es. accanto alla pagina, con test), non nello schema.

## Impatto per pacchetto

| Pacchetto | R4 |
| --- | --- |
| `be/` | `trainingFrequency` + test; `listCoachClientRows` in `coachAthleteAccess.ts`; la route `GET /clients` in `coach.ts` la usa al posto di `listCoachAthletes`. `getCoachAthlete`, `listCoachAthletes`, `loadCoachAnalyticsOverview` invariati |
| `fe/` | `fe/src/api/schemas/coach.ts`: nuovo `coachClientListItemSchema = coachClientSchema.extend({ subscription, lastSessionOn, last14Days })` che riusa `subscriptionStatusSchema` di `schemas/subscription.ts`; `coachClientsSchema = z.array(coachClientListItemSchema)`; `coachClientSchema` **non cambia** (resta in `coachClientDetailSchema.client` e in `coachAnalytics.ts`). Tipo nuovo `CoachClientListItem`. Pagina `fe/src/pages/coach/clients/` con tabella e filtri. Gli altri consumatori di `getCoachClients` (`dashboard/api/useDashboard.ts`, `assignments/new/index.tsx`, `mapDashboard.ts` che accetta `CoachClient[]`) compilano senza modifiche: il tipo nuovo è un sovrainsieme |
| `mobile/` | nessuno: `mobile/src` e `mobile/app` non chiamano `/coach/clients` (verificato con grep). Nessuna copia di schema da aggiornare |
| `landing/` | nessuno |
| Dati | nessuna migrazione in R4 (vedi D8) |

## Retrocompatibilità e rilascio

- Client vecchio + backend nuovo: lo schema Zod di oggi (`z.object`) scarta le chiavi in più. Funziona.
- Client nuovo + backend vecchio: `coachClientsSchema` con campi obbligatori fallisce, e con lui dashboard, "Nuova assegnazione" e Clienti. Succede solo nella finestra in cui GitHub Pages ha pubblicato e Railway non ancora.
- Nessun client in produzione è mobile per questa route.
- Rollback: tornare al codice precedente non lascia nulla nel DB (nessuna migrazione).

Checklist di rilascio:

- [ ] **FE prima del BE (Pages contro Railway).** Il push su `main` pubblica il pannello su GitHub Pages e, separatamente, l'API su Railway. Se Pages finisce prima, Clienti, dashboard e "Nuova assegnazione" mostrano l'errore di caricamento finché Railway non ha finito. Dopo il merge: controllare che il deploy Railway sia completato e che `GET /api/coach/clients` in produzione risponda con `subscription`, `lastSessionOn` e `last14Days`; solo allora il rilascio è chiuso. Se R4 viene diviso in due PR, la PR del backend va in produzione per prima.
- [ ] Prova reale sul pannello pubblicato: tabella Clienti, i cinque filtri, un link con `?stato=in-scadenza`.

## Sicurezza e permessi

- Ogni query filtra per `coach_id` del coach autenticato, direttamente o tramite join su `coach_athletes`: nessun abbonamento, pausa, sessione o scheda di un altro coach entra nella risposta.
- Le sessioni contate sono tutte quelle dell'atleta collegato, anche di schede personali: escono solo un conteggio e un giorno, come già fanno gli alert di `/coach/analytics/overview`.
- Nessun importo nella risposta.
- Gli atleti non hanno accesso (`requireRole("coach")`).

## Decisioni prese

Scelte dall'utente il 2026-10-26: **D1-A**, **D2-C**, **D3-A**, **D4-A**, **D5-A**, **D6-A**, **D7-A**, **D8-A**. Le opzioni scartate restano come riferimento.

### D1 — Schema e tipo della riga lista nel client: A

| Opzione | Come |
| --- | --- |
| **A (scelta)** | schema nuovo `coachClientListItemSchema` / tipo `CoachClientListItem`, che estende `coachClientSchema` |
| B | campi nuovi `.optional()` dentro `coachClientSchema` |
| C | il backend aggiunge i campi anche a `client` del dettaglio e di analytics, schema unico |

Perché A: il dettaglio e analytics restano identici e tipizzati senza `undefined`; i campi della lista sono obbligatori dove servono. B porta `undefined` in ogni consumatore e nasconde un backend vecchio. C allarga R4 a due route che non ne hanno bisogno (il dettaglio ha già la tab Abbonamento).

### D2 — Forma della frequenza: C

| Opzione | Forma |
| --- | --- |
| A | contenitore `frequency` con i due conteggi abbreviati del primo testo (suffisso `Last14d`) |
| B | come A con contenitore `attendance` |
| **C (scelta)** | `last14Days: { completedSessions, expectedSessions }` |

Perché C: nessuna abbreviazione (`code-style.md` §1); la finestra sta nel nome del contenitore, una volta sola, e i due campi dicono cosa contano. Il tipo è `TrainingFrequency`, come la funzione che lo calcola.

### D3 — Dove vive la regola della frequenza (e l'accesso DB): A

| Opzione | Funzione pura | Accesso DB |
| --- | --- | --- |
| **A (scelta)** | `be/src/services/clientActivity.ts` → `trainingFrequency` | `listCoachClientRows` in `coachAthleteAccess.ts` |
| B | `be/src/services/churnRisk.ts` (il file che il piano assegna a R5) → `sessionFrequency` | come A |
| C | `be/src/services/trainingFrequency.ts` → `countRecentSessions` | `be/src/services/coachClientList.ts` → `loadCoachClientList` |

Perché A: il nome dice cosa misura e non lega R4 al rischio; R5 importa `trainingFrequency` e `FREQUENCY_WINDOW_DAYS` da `churnRisk.ts`.

### D4 — Cosa sono i "giorni della scheda": A

Righe `workout_days` della scheda attiva. Scartate: giorni della settimana di `workout_day_weekdays` (pianificazione facoltativa, regola a due rami) e `workouts.frequency` (testo libero). Perché A: lettura letterale del piano, esiste sempre (`assignBlankProgram` crea "Giorno 1"), si spiega al coach.

### D5 — Quali sessioni contano: A

Tutte le sessioni completate dell'atleta, una per sessione. Scartate: solo le sessioni sulla scheda attiva (azzera la frequenza a ogni cambio di scheda) e giorni distinti (caso raro, nome meno chiaro). Perché A: per il rischio conta che l'atleta si alleni; è la regola di `loadLastSessionDate` e degli alert, quindi `lastSessionOn` e `last14Days` restano coerenti.

### D6 — Scheda iniziata dentro la finestra: A

Sempre giorni × 2, senza proporzione. Scartate: attesa proporzionale ai giorni coperti, `null` per le prime due settimane. Perché A: è la regola del piano e la tabella mostra numeri grezzi ("2 / 6") che il coach legge da solo.

### D7 — Valori di `?stato=` e `ended` nei filtri: A

| Opzione | Valori | `ended` |
| --- | --- | --- |
| **A (scelta)** | `in-scadenza`, `scaduti`, `in-pausa`, `senza-abbonamento` | in "Senza abbonamento", con etichetta "Chiuso" sulla riga |
| B | `expiring`, `expired`, `paused`, `none` | come A |
| C | come A | solo in Tutti |

Perché A: il parametro è italiano (`stato`) e i valori lo seguono; R5 genera i link con una mappa fissa. Un abbonamento chiuso di un cliente collegato è da rimettere in regola, quindi sta nel filtro dell'onboarding.

### D8 — Indici: A

Nessun indice né migrazione in R4. Le query 4 e 5 non hanno un indice utile (`workout_sessions` ha solo l'indice parziale `workout_sessions_one_active_per_user`; `program_assignments.coach_id` e `workout_days.workout_id` non sono indicizzati), come già oggi per dashboard e analytics. Si misura con `EXPLAIN ANALYZE` quando i dati di produzione crescono. Scartate per ora: indice parziale `workout_sessions (user_id, completed_at) WHERE status = 'completed'`, e in più `program_assignments (coach_id)` e `workout_days (workout_id)`; se servono, sono una migrazione a sé (`team-db-migration`, approvazione esplicita), non dentro R4.

### Note da confermare (non bloccanti)

1. **Scheda appena iniziata** (conseguenza di D6): un cliente con una scheda di 3 giorni fa risulta "2 / 6". In R4 è solo un numero; R5, che trasforma il rapporto in rischio, può decidere di attenuarlo senza cambiare la forma di questo contratto (cambierebbe solo il valore di `expectedSessions`).
2. **Ordinamento della tabella**: il backend tiene l'ordine di oggi (nome, email). Un ordinamento per urgenza o per scadenza, se serve, si fa nel client come i filtri.
3. **Quando misurare** (conseguenza di D8): proposta di soglia per riaprire gli indici, da confermare: `GET /coach/clients` sopra i 200 ms in produzione o `workout_sessions` oltre 100.000 righe.

## Testo proposto per il Decisions log di `WORKBOOK.md`

> 2026-10-26 — R4: `GET /coach/clients` aggiunge per riga `subscription` (stato R2 + `paidThrough`, o `null`), `lastSessionOn` e `last14Days { completedSessions, expectedSessions }`; filtri solo nel client con `?stato=` (`ended` in "Senza abbonamento"); nessun indice nuovo. Perché: una sola chiamata per la tabella, cambio additivo, il mobile non usa la route; la regola della frequenza è una funzione pura che R5 riusa. Contratto: `docs/contracts/pt-clienti.md`.
