# Contratto R5 — Rischio abbandono e inbox Oggi

Stato: **approvato** il 2026-10-27 (Contract Gate di R5, run RUN-0006 / T1): nomi raccomandati N1–N11, risposte Q1–Q5 tutte **A**, testo in italiano.
Piano: [`docs/plans/PT-registro.md`](../plans/PT-registro.md), righe "Rischio abbandono", "Oggi", logica 3–4, R5. Contratti di riferimento: [`pt-registro.md`](pt-registro.md) (stato abbonamento, pausa), [`pt-clienti.md`](pt-clienti.md) (`subscription`, `lastSessionOn`, `last14Days`, `trainingFrequency`).

Identificatori, route ed errori in inglese; i testi che l'API restituisce (`message`) sono in italiano, come `buildCoachAlerts` oggi. I nomi nuovi non fissati dal piano sono quelli raccomandati in [Nomi da scegliere](#nomi-da-scegliere) (**N1** … **N11**); le scelte di [Domande aperte](#domande-aperte) (**Q1** … **Q5**) sono chiuse con l'opzione **A**, quella usata nel corpo.

## Decisioni già prese dall'utente (non si riaprono)

1. Pagina web **Oggi** su `/today`; `/dashboard` reindirizza lì; voce di menu "Oggi" (solo FE).
2. Oggi mostra solo l'inbox e il feed attività. KPI, grafico rinnovi e tabella atleti della dashboard escono dalla pagina (i KPI tornano in Business, R8).
3. I record personali entrano nell'inbox in R5 come motivo informativo, priorità più bassa.
4. `GET /coach/clients` riceve per riga il campo `risk`, in modo additivo.
5. Regola del rischio: alto = abbonamento in scadenza entro 14 g **e** (frequenza < 50% **o** nessuna sessione da 7+ g); medio = una sola delle due condizioni; in pausa nessun rischio; senza scheda attiva conta solo "giorni dall'ultima sessione". Output: livello + motivi in italiano.
6. "Gestito" nasconde la riga di un cliente per 7 g; torna prima se la gravità attuale supera `severityAtHandle`.
7. Tutto additivo; nessuna modifica al mobile; testi e pulsanti WhatsApp sono R7.

## Regole comuni

- Tutte le route stanno sotto `/api/coach`, dietro `requireAuth` + `requireRole("coach")` (401 / 403 come oggi).
- "Oggi" è `todayInRome()`; ogni data è un giorno di calendario di Roma `YYYY-MM-DD`. Gli istanti (`completed_at`, `handled_at`, `coach_athletes.created_at`) si convertono al giorno di Roma con `toRomeDateKey` in TypeScript, non in SQL (stesso motivo di R4: le colonne `timestamp` contengono l'istante UTC senza fuso).
- Solo i clienti **collegati** (`coach_athletes`) del coach autenticato. Gli ex clienti non hanno righe in Oggi né rischio (non compaiono in `GET /coach/clients`, regola R4).
- Le GET non scrivono: niente `syncAssignmentStatusesForCoach`; la scheda attiva si decide dalle date come in R4.
- Errori: sempre `{ "error": string }` in inglese; la copy italiana sta nel client (`fe/src/api/knownErrorMessages.ts`).
- Nessuna paginazione: un coach ha qualche decina di clienti.
- **Restano invariate**: `GET /coach/dashboard` (stessa forma, stesse query, vedi [Consumatori](#impatto-per-pacchetto)), `GET /coach/analytics/overview` e `GET /coach/analytics/clients/:athleteId` (i loro `alerts` di `buildCoachAlerts` non cambiano), `GET /coach/clients/:athleteId`.

## Endpoint

| Metodo | Path | Successo | Note |
| --- | --- | --- | --- |
| GET | `/coach/today` | 200 `CoachToday` | nuova |
| POST | `/coach/today/:athleteId/handled` | 204 | nuova, idempotente |
| DELETE | `/coach/today/:athleteId/handled` | 204 | nuova, annulla "Gestito" (**Q2**), idempotente |
| GET | `/coach/clients` | 200 `CoachClientListItem[]` | **additivo**: `risk` per riga |

## Tipi di risposta

```ts
type InboxSeverity = "high" | "medium" | "low";            // (N3) ordine: high > medium > low

type ChurnRiskLevel = "high" | "medium";

type ChurnRiskReasonKind =                                  // (N4)
  | "subscription_expiring"   // abbonamento non scaduto che scade entro 14 g (daysLeft 0..14)
  | "subscription_expired"    // abbonamento scaduto (daysLeft < 0)
  | "low_frequency"           // sessioni completate < 50% di quelle attese nei 14 g
  | "no_recent_session";      // nessuna sessione completata da 7+ g

type ChurnRiskReason = { kind: ChurnRiskReasonKind; message: string };

type ChurnRisk = {                                          // (N4) stesso oggetto in /coach/clients e /coach/today
  level: ChurnRiskLevel;
  reasons: ChurnRiskReason[];                               // almeno 1, ordine fisso: abbonamento, low_frequency, no_recent_session
};

type InboxAlertKind = "program_expiring" | "personal_records"; // (N5)

type InboxAlert = { kind: InboxAlertKind; message: string };

type InboxItem = {                                          // (N2) una riga per cliente
  athleteId: number;
  athleteName: string | null;
  athleteEmail: string;
  severity: InboxSeverity;
  risk: ChurnRisk | null;
  alerts: InboxAlert[];                                     // motivi fuori dal rischio, ordine: program_expiring, personal_records
  subscription: ClientSubscriptionSummary | null;           // identico a GET /coach/clients (R4)
};

type CoachToday = {                                         // (N1)
  clientCount: number;                                      // clienti collegati, anche senza riga
  handledCount: number;                                     // righe nascoste da "Gestito" adesso
  items: InboxItem[];                                       // ordinate per urgenza
  recentActivity: CoachDashboardActivityItem[];             // (Q1) identico a GET /coach/dashboard .recentActivity
};

// Già esistenti, invariati
type ClientSubscriptionSummary = { status: SubscriptionStatus; paidThrough: string; daysLeft: number; pausedUntil: string | null };
type CoachDashboardActivityItem = { sessionId: number; athleteId: number; athleteName: string | null; athleteEmail: string; workoutId: number; workoutName: string; completedAt: string };
```

Una riga ha almeno un motivo: `risk !== null || alerts.length > 0`. Il `message` serve solo a mostrare il testo: il client decide colori, icone e (in R7) il testo WhatsApp dal `kind`, mai dal `message`.

**Perché lo stato pagamento non è un motivo a parte.** La condizione "abbonamento in scadenza entro 14 g" del rischio copre sempre "in scadenza ≤ 7 g" e "scaduto" (**Q5**): un cliente con pagamento in scadenza o scaduto ha quindi sempre un rischio almeno medio, con il motivo `subscription_expiring` o `subscription_expired`. Un motivo pagamento separato ripeterebbe lo stesso fatto nella stessa riga. Il client distingue "deve pagare" (`subscription.status` `expiring` / `expired`) da "scade tra 8–14 g" (`active`) con `subscription`.

**Perché non c'è un motivo "inattivo" a parte.** "Nessuna sessione da 7+ g" è la condizione `no_recent_session` del rischio, che vale per ogni cliente non in pausa: da solo dà rischio medio. L'alert `inactive` di `buildCoachAlerts` non entra in Oggi.

## GET `/coach/today`

```json
{
  "clientCount": 12,
  "handledCount": 1,
  "items": [
    {
      "athleteId": 42,
      "athleteName": "Giulia Rossi",
      "athleteEmail": "giulia@example.com",
      "severity": "high",
      "risk": {
        "level": "high",
        "reasons": [
          { "kind": "subscription_expiring", "message": "Abbonamento in scadenza tra 3 giorni" },
          { "kind": "low_frequency", "message": "2 sessioni su 6 negli ultimi 14 giorni" }
        ]
      },
      "alerts": [
        { "kind": "program_expiring", "message": "Scheda in scadenza tra 5 giorni" }
      ],
      "subscription": { "status": "expiring", "paidThrough": "2026-10-30", "daysLeft": 3, "pausedUntil": null }
    },
    {
      "athleteId": 57,
      "athleteName": "Marco Bianchi",
      "athleteEmail": "marco@example.com",
      "severity": "medium",
      "risk": {
        "level": "medium",
        "reasons": [{ "kind": "subscription_expired", "message": "Abbonamento scaduto da 4 giorni" }]
      },
      "alerts": [],
      "subscription": { "status": "expired", "paidThrough": "2026-10-23", "daysLeft": -4, "pausedUntil": null }
    },
    {
      "athleteId": 61,
      "athleteName": null,
      "athleteEmail": "luca@example.com",
      "severity": "medium",
      "risk": {
        "level": "medium",
        "reasons": [{ "kind": "no_recent_session", "message": "Nessuna sessione da quando è cliente (9 giorni)" }]
      },
      "alerts": [],
      "subscription": null
    },
    {
      "athleteId": 70,
      "athleteName": "Sara Verdi",
      "athleteEmail": "sara@example.com",
      "severity": "low",
      "risk": null,
      "alerts": [{ "kind": "personal_records", "message": "Nuovi record: Panca piana, Squat" }],
      "subscription": { "status": "active", "paidThrough": "2026-12-15", "daysLeft": 49, "pausedUntil": null }
    }
  ],
  "recentActivity": [
    {
      "sessionId": 901,
      "athleteId": 70,
      "athleteName": "Sara Verdi",
      "athleteEmail": "sara@example.com",
      "workoutId": 33,
      "workoutName": "Forza A",
      "completedAt": "2026-10-26T17:42:10.000Z"
    }
  ]
}
```

Esempio per oggi = `2026-10-27`. Nessun query param; parametri sconosciuti ignorati. Nessun errore oltre 401 / 403.

**Stato vuoto**: `items: []`. Il client distingue con `clientCount` e `handledCount`: `clientCount = 0` → nessun cliente (invito); `handledCount > 0` → "hai gestito tutto"; altrimenti "tutto in ordine". Le copy sono del FE.

### Chi ha una riga

Per ogni cliente collegato, nell'ordine:

1. **In pausa** (`subscription.status === "paused"`): nessuna riga, nessun rischio, nessun alert. Il piano dice che la pausa "toglie il cliente da avvisi, rischio ed entrate attese"; vale anche per scheda in scadenza e record.
2. `risk = churnRisk(...)` (regola in "Rischio abbandono" sotto).
3. `alerts` = `program_expiring` se c'è, poi `personal_records` se c'è.
4. Nessun rischio e nessun alert → nessuna riga.
5. `severity` = il più alto tra `risk.level` (`high` → `high`, `medium` → `medium`), `program_expiring` (`medium`), `personal_records` (`low`).
6. Applicazione di "Gestito" (sezione "Gestito" sotto): la riga esce da `items` e conta in `handledCount`.

Gli abbonamenti `ended` di un cliente ancora collegato non danno la condizione abbonamento del rischio (non "scadono", sono chiusi); le altre condizioni e gli alert valgono. Un cliente senza abbonamento è trattato allo stesso modo.

### `program_expiring`

Regola di `buildCoachAlerts` (`daysLeft = expiresAt − oggi`, riga se `0 <= daysLeft <= 7`), applicata alla **scheda attiva di questo coach** come la definisce R4 (`coach_id` = coach, `status <> 'revoked'`, `starts_at <= oggi <= expires_at`, `id` più alto). Differenza voluta da `loadActiveProgramExpiry` di analytics, che guarda le schede di qualsiasi coach e non esclude `revoked`: Oggi usa la stessa scheda di `last14Days`.

| `daysLeft` | `message` |
| --- | --- |
| 0 | `Scheda in scadenza oggi` |
| 1 | `Scheda in scadenza domani` |
| 2..7 | `Scheda in scadenza tra N giorni` |

"Scheda" come nel menu del pannello e nell'app atleta (scelta T11 del 2026-10-27). Analytics (`buildCoachAlerts`) dice ancora "Programma": allinearlo è fuori scope di R5.

### `personal_records`

**Finestra**: 7 giorni di Roma, oggi incluso (`oggi − 6` … `oggi`), come "ultima settimana".

**Cosa è un record**: per ogni esercizio, il miglior e1RM di una sessione è il massimo di `computeE1RM(weightKg, reps)` sui suoi set (solo `weightKg > 0` e `reps` 1..12, regola esistente di `analytics.ts`). Si scorrono le sessioni completate dell'atleta per `completedAt` crescente (a parità, `sessionId` crescente). Una sessione fa un record su un esercizio se il suo miglior e1RM è **strettamente maggiore** del migliore di tutte le sessioni precedenti per lo stesso esercizio. **La prima volta che un esercizio compare non è un record** (differenza voluta da `countPersonalRecords`, che la conta: in Oggi ogni scheda nuova darebbe "record" su tutti gli esercizi).

**Stesso esercizio** (**Q4**): `catalogId` se presente, altrimenti il nome con `trim` e minuscole. `exercises.id` non basta: ogni assegnazione e ogni revisione copiano gli esercizi con id nuovi, e lo storico ripartirebbe a ogni scheda.

**Storico** (**Q4**): tutte le sessioni completate dell'atleta, non solo la finestra; tutte le sessioni dell'atleta, anche fuori dalle schede del coach (regola D5 di R4).

**Riga**: se almeno un esercizio ha un record in una sessione con giorno di Roma nella finestra. Il nome mostrato è `exercises.name` della sessione più recente con record per quell'esercizio. Nomi in ordine alfabetico (`localeCompare` con `"it"`), al massimo tre:

| Esercizi con record | `message` |
| --- | --- |
| 1 | `Nuovo record: Panca piana` |
| 2–3 | `Nuovi record: Panca piana, Squat` |
| 4+ | `Nuovi record: Panca piana, Squat, Stacco e altri 2` |

### Ordinamento di `items`

Chiavi, in ordine:

1. `severity` decrescente (`high`, `medium`, `low`).
2. Giorni alla scadenza dell'abbonamento crescenti (lo scaduto da più tempo prima). Vale `subscription.daysLeft` solo con `status` `active`, `expiring` o `expired`; senza abbonamento o con `ended` il cliente va dopo.
3. Giorni senza sessione decrescenti (`oggi − max(lastSessionOn, giorno di collegamento)`, vedi **Q3** e **C4**).
4. `athleteName` crescente con i `null` in fondo, poi `athleteEmail`, poi `athleteId`: lo stesso ordine di `GET /coach/clients` reso deterministico.

Così un cliente che non ha pagato sale in cima ai `medium` senza cambiare la regola del rischio (**Q5**).

## Gestito: quando una riga è nascosta e quando torna

Riga salvata in `coach_inbox_handled` per la coppia `(coachId, athleteId)` con `handledAt` (istante) e `severityAtHandle`.

```
handledOn   = toRomeDateKey(handledAt)
isHidden    = oggi < addRomeDays(handledOn, 7)
              && rank(severity attuale) <= rank(severityAtHandle)
rank: low = 1, medium = 2, high = 3
```

- **7 giorni**: segnato il 27/10 (qualsiasi ora), la riga torna il 03/11. Giorni di Roma, come ogni altra finestra del registro.
- **"Peggiora"** = la `severity` della riga calcolata oggi ha rango **strettamente maggiore** di `severityAtHandle`. Gestito a `medium`, oggi `high` → torna subito (e non conta in `handledCount`). Gestito a `medium`, oggi `medium` con un motivo diverso → resta nascosta fino al settimo giorno (limite accettato: la regola del piano guarda la gravità, non i motivi). Gestito a `high`, oggi `medium` o `low` → nascosta.
- Un cliente senza riga oggi (ha pagato, è in pausa) non conta in `handledCount`, anche se ha un Gestito salvato. Il Gestito salvato non si cancella: se la riga ricompare entro i 7 giorni con gravità non superiore resta nascosta.
- Le righe nascoste **non** escono in `items` (solo `handledCount`, **Q2**).

## POST `/coach/today/:athleteId/handled`

Nessun body (un body presente viene ignorato; JSON malformato → 400 `"Invalid request body"` dall'error handler globale, come ogni route).

1. `:athleteId` non intero o fuori range (`isDatabaseId`) → 400 `"Invalid athlete id"`.
2. Atleta non collegato al coach → 404 `"Client not found"`.
3. Il server calcola la riga del cliente **adesso**, con la stessa logica di `GET /coach/today` ignorando i Gestito salvati. `severityAtHandle` viene da qui, mai dal client.
4. Nessuna riga (in pausa, ha pagato nel frattempo, niente da segnalare) → **204 senza scrittura**. Il client ricarica Oggi e la riga sparisce comunque.
5. Altrimenti, in una transazione: `SELECT ... FOR SHARE` della riga `coach_athletes` della coppia (manca → 404 `"Client not found"`, stesso ordine dei lock di R2), poi upsert su `(coach_id, athlete_id)` con `handled_at = now()` e `severity_at_handle` = severità calcolata. → 204.

**Idempotenza**: ripetere la POST sovrascrive `handledAt` e `severityAtHandle` (riparte la settimana). Due POST concorrenti: vince l'ultima, nessun errore.

Ordine dei controlli: id 400 → `Client not found` 404 → calcolo → scrittura.

## DELETE `/coach/today/:athleteId/handled` (Q2)

Annulla "Gestito" (il toast "Annulla" subito dopo il clic). Cancella la riga `coach_inbox_handled` della coppia.

- 400 `"Invalid athlete id"`, 404 `"Client not found"` come la POST.
- Nessuna riga salvata → 204 lo stesso (idempotente).
- 204 senza body.

## `risk` su GET `/coach/clients` (additivo)

Ogni riga di R4 riceve un campo in più:

```json
{
  "id": 42,
  "email": "giulia@example.com",
  "name": "Giulia Rossi",
  "createdAt": "2026-03-02T10:11:12.000Z",
  "linkedAt": "2026-09-17T08:00:00.000Z",
  "subscription": { "status": "expiring", "paidThrough": "2026-10-30", "daysLeft": 3, "pausedUntil": null },
  "lastSessionOn": "2026-10-24",
  "last14Days": { "completedSessions": 2, "expectedSessions": 6 },
  "risk": {
    "level": "high",
    "reasons": [
      { "kind": "subscription_expiring", "message": "Abbonamento in scadenza tra 3 giorni" },
      { "kind": "low_frequency", "message": "2 sessioni su 6 negli ultimi 14 giorni" }
    ]
  }
}
```

- `risk: ChurnRisk | null`; `null` = nessun rischio (anche in pausa).
- **Coerenza**: per lo stesso cliente nello stesso giorno, `risk` di `/coach/clients` è identico a `items[].risk` di `/coach/today` (stessa funzione, stessi input). "Gestito" non tocca `/coach/clients`: il rischio resta visibile nella tabella anche se la riga di Oggi è nascosta.
- Ordine delle righe, campi esistenti, nessun errore nuovo: tutto invariato.
- Nessuna query in più: `risk` si calcola in memoria da `subscription`, `last14Days`, `lastSessionOn` e `linkedAt`, già caricati da `listCoachClientRows`.

## Rischio abbandono (`be/src/services/churnRisk.ts`)

Condizioni:

| Nome | Vera quando |
| --- | --- |
| **A — abbonamento** | `subscription !== null`, `status` ∈ {`active`, `expiring`, `expired`} e `daysLeft <= 14` (**Q5**: uno scaduto la soddisfa sempre) |
| **B1 — frequenza** | scheda attiva (`last14Days.expectedSessions !== null`) e `completedSessions * 2 < expectedSessions` (strettamente sotto il 50%: 3 su 6 non è rischio) |
| **B2 — inattività** | `oggi − max(lastSessionOn, giorno di Roma di linkedAt) >= 7` (**Q3**; **C4**, 2026-10-27: le sessioni fatte prima del collegamento non anticipano il rischio, un cliente collegato da meno di 7 giorni non è mai inattivo) |
| **B — attività** | B1 **o** B2 |

Livello:

- `status === "paused"` → `null` (prima di tutto).
- A **e** B → `high`.
- solo A, oppure solo B → `medium`. B1 e B2 insieme senza A sono **una** condizione (l'attività), quindi `medium` con due motivi.
- nessuna → `null`.

Senza scheda attiva (`expectedSessions === null`, anche scheda con 0 giorni come in R4) B1 è falsa: conta solo B2, come chiede il piano.

Motivi, in quest'ordine, uno per condizione vera:

| `kind` | Quando | `message` |
| --- | --- | --- |
| `subscription_expiring` | A con `daysLeft >= 0` | `Abbonamento in scadenza oggi` (0) · `Abbonamento in scadenza domani` (1) · `Abbonamento in scadenza tra N giorni` |
| `subscription_expired` | A con `daysLeft < 0` | `Abbonamento scaduto ieri` (−1) · `Abbonamento scaduto da N giorni` |
| `low_frequency` | B1 | `C sessioni su E negli ultimi 14 giorni` (`1 sessione su 6 …` al singolare; `0 sessioni su 6 …`) |
| `no_recent_session` | B2 | con `lastSessionOn` dal giorno del collegamento in poi: `Nessuna sessione da N giorni`; senza `lastSessionOn` o con l'ultima sessione prima del collegamento: `Nessuna sessione da quando è cliente (N giorni)` |

```ts
export const churnRisk = (input: {                         // (N6)
  subscription: { status: SubscriptionStatus; daysLeft: number } | null;
  last14Days: TrainingFrequency;                            // da trainingFrequency (R4), riusata
  lastSessionOn: string | null;
  linkedOn: string;                                         // giorno di Roma di coach_athletes.created_at
  today: string;
}): ChurnRisk | null;
```

Riusa `FREQUENCY_WINDOW_DAYS` e `TrainingFrequency` di `clientActivity.ts`; `SubscriptionStatus` va esportato da `subscription.ts` (oggi è un tipo locale) o ridefinito nel tipo d'ingresso. La conversione `Date → giorno di Roma` resta al bordo (accesso DB).

**Limite accettato** (conseguenza di D6 di R4): una scheda iniziata 3 giorni fa con 3 giorni a settimana e 1 sessione fatta dà `1 su 6` e quindi B1. Con abbonamento in scadenza il rischio è alto. La regola resta quella del piano; se diventa rumore si corregge solo il valore di `expectedSessions`, senza cambiare la forma.

### Test (`be/src/services/churnRisk.test.ts`)

1. In pausa con tutte le condizioni vere → `null`.
2. Senza abbonamento, ultima sessione 6 giorni fa → `null`; 7 giorni fa → `medium` [`no_recent_session`].
3. `active`, `daysLeft` 15 e attività regolare → `null`; `daysLeft` 14 → `medium` [`subscription_expiring`, "tra 14 giorni"].
4. `expiring` `daysLeft` 3 e 2 su 6 → `high` [`subscription_expiring`, `low_frequency`].
5. Stesso con 3 su 6 → `medium` (50% non è sotto il 50%).
6. `expired` `daysLeft` −1 con attività regolare → `medium`, "Abbonamento scaduto ieri"; −30 → "da 30 giorni".
7. `expired` e nessuna sessione da 9 giorni → `high`.
8. `ended` e nessuna sessione da 9 giorni → `medium` senza motivo abbonamento.
9. Senza scheda (`expectedSessions` `null`), 0 sessioni nella finestra ma ultima 10 giorni fa → `medium` [`no_recent_session`]; ultima 3 giorni fa → `null`.
10. Mai allenato, collegato 6 giorni fa → `null`; 7 giorni fa → `medium`, "da quando è cliente (7 giorni)".
11. B1 e B2 senza A → `medium` con due motivi nell'ordine `low_frequency`, `no_recent_session`.
12. Messaggi: `daysLeft` 0 "oggi", 1 "domani"; "1 sessione su 6".

## Inbox (`be/src/services/coachToday.ts`)

Funzioni pure (**N6**), con test in `coachToday.test.ts`:

```ts
/** Una riga per cliente, null se non c'è niente da segnalare o il cliente è in pausa. */
export const inboxItem = (input: {
  client: { athleteId: number; athleteName: string | null; athleteEmail: string; linkedOn: string };
  subscription: ClientSubscriptionSummary | null;
  lastSessionOn: string | null;
  last14Days: TrainingFrequency;
  programExpiresOn: string | null;                         // expiresAt della scheda attiva di questo coach
  personalRecordExercises: string[];                        // nomi già calcolati da recentPersonalRecords
  today: string;
}): InboxItem | null;

/** Esercizi con un record nella finestra di 7 giorni. `sets` sono di un solo atleta. */
export const recentPersonalRecords = (input: {
  sets: {
    sessionId: number;
    completedAt: Date;
    exerciseKey: string;                                    // catalogId, o nome trim + minuscole (Q4)
    exerciseName: string;
    weightKg: number | null;
    reps: number;
  }[];
  today: string;
}): string[];

/** Ordina, applica Gestito e conta le righe nascoste. */
export const buildInbox = (input: {
  entries: { item: InboxItem; daysWithoutSession: number }[]; // daysWithoutSession: chiave 3 dell'ordinamento
  handled: { athleteId: number; handledAt: Date; severityAtHandle: InboxSeverity }[];
  today: string;
}): { items: InboxItem[]; handledCount: number };
```

`daysWithoutSession` non esce nella risposta: serve solo all'ordinamento. Il contratto pubblico è `CoachToday`; le firme interne possono cambiare in PR purché le funzioni restino pure e i test sopra passino.

Test minimi:

1. `severity`: rischio alto → `high`; rischio medio → `medium`; solo `program_expiring` → `medium`; solo record → `low`; niente → `null`.
2. In pausa con scheda in scadenza e record → `null`.
3. `program_expiring`: `daysLeft` 0 "oggi", 1 "domani", 7 incluso, 8 escluso, scheda già scaduta esclusa.
4. Record: prima comparsa non è record; uguale non è record; strettamente maggiore sì; record a `oggi − 6` conta, a `oggi − 7` no; stesso `catalogId` su due schede diverse è lo stesso esercizio; senza `catalogId` "Panca Piana " e "panca piana" sono lo stesso; set con `weightKg` `null`/0 o `reps` 13 ignorati; 4 esercizi → "e altri 1".
5. Ordinamento: `high` > `medium` > `low`; a parità, scaduto da 10 g prima di scaduto da 2 g prima di in scadenza tra 5; senza abbonamento dopo; poi giorni senza sessione; poi nome (`null` in fondo), email, id.
6. Gestito: stessa gravità dal giorno 0 al 6 → nascosta e contata; giorno 7 → visibile; gravità maggiore → visibile e non contata; gravità minore → nascosta; Gestito di un cliente senza riga → non contato.
7. Giorno di `handledAt` in Roma: le 23:30 UTC del 26/10 sono il 27/10 a Roma (torna il 03/11).

## Modello dati — tabella `coach_inbox_handled` (migrazione `0016`, additiva)

File Drizzle `be/src/db/schema/coachinboxhandled.ts` (**N9**), esportato da `schema/index.ts`.

| Colonna | Tipo | Vincoli |
| --- | --- | --- |
| `id` | `serial` | PK (come tutte le tabelle del registro) |
| `coach_id` | `integer` | not null |
| `athlete_id` | `integer` | not null |
| `handled_at` | `timestamp` | not null, default `now()` |
| `severity_at_handle` | `text` | not null, check `IN ('high', 'medium', 'low')` con `sqlInList` da `INBOX_SEVERITIES` (**N3**), come `period_unit` |

- **Unicità**: `unique("coach_inbox_handled_coach_athlete").on(coachId, athleteId)`: una riga per coppia, la POST fa upsert su questo vincolo. L'indice che crea guida con `coach_id` e serve anche la lettura di `GET /coach/today` (`WHERE coach_id = :coach`). Nessun altro indice.
- **FK composta verso il collegamento**: `foreignKey({ columns: [coachId, athleteId], foreignColumns: [coachAthletes.coachId, coachAthletes.athleteId] }).onDelete("cascade")`, che punta al vincolo esistente `coach_athletes_coach_id_athlete_id_unique` (0005). Effetto: lo scollegamento (`unlinkCoachAthlete`, entrambi i chiamanti) e la cancellazione di un utente tolgono i Gestito senza codice in più; un atleta che si ricollega riparte pulito; non si può scrivere un Gestito per una coppia non collegata (la FK lo rifiuta: per questo la POST prende il lock `FOR SHARE` e risponde 404 prima). Non servono FK separate verso `users`: passano dalla cascata di `coach_athletes`.
- Alternative scartate: FK separate a `users` con cancellazione esplicita nello scollegamento (codice in due chiamanti, Gestito orfani se se ne dimentica uno); nessuna FK con righe vecchie ignorate (un ricollegamento entro 7 giorni erediterebbe il Gestito).

**Migrazione**: `npm run db:generate -- --name pt_oggi` → `be/drizzle/0016_pt_oggi.sql` + `meta/0016_snapshot.json`. Solo `CREATE TABLE`, il vincolo unique, il check e la FK composta.

**Per il database-engineer**: in R1 drizzle ha rigenerato `waitlist_signups` perché `0013` non ha snapshot; gli snapshot `0014` e `0015` ora sono allineati, ma **controllare l'SQL generato** prima di applicarlo: deve contenere solo `coach_inbox_handled`. Poi: migrazioni da zero su `smoke_test` ricreato + `drizzle-kit check` (approvazione esplicita richiesta per `db:*` e `dropdb`).

**Rollback**: tornare al codice precedente lascia la tabella, che il codice vecchio ignora. Toglierla è una `0017` con `DROP TABLE` (perde solo i Gestito, dato effimero).

## Query (numero fisso per richiesta)

### GET `/coach/today`

Accesso DB in un file nuovo (**N7**: `be/src/services/coachTodayAccess.ts`, funzione `loadCoachToday(coachId, today)`). Tutte in `Promise.all`, unite in memoria per `athleteId`. Nessuna query per cliente.

| # | Cosa | Origine | Filtro |
| --- | --- | --- | --- |
| 1–6 | clienti, abbonamenti, pause vive, ultima sessione, sessioni della finestra 14 g, scheda attiva + giorni | **i sei statement di `listCoachClientRows` (R4)**, riusati | come R4 |
| 6 (estesa) | la query della scheda attiva aggiunge `expires_at` al `SELECT` | `program_assignments` | invariato; `GROUP BY program_assignments.id` lo permette già (dipende dalla PK) |
| 7 | Gestito del coach | `coach_inbox_handled` | `coach_id = :coach` (indice unique) |
| 8 | set per i record | `logged_sets` ⨝ `workout_sessions` ⨝ `coach_athletes` ⨝ `exercises` | `coach_athletes.coach_id = :coach`, sessione `completed` con `completed_at` non nullo, `weight_kg > 0`, `reps BETWEEN 1 AND 12`; solo atleti con almeno una sessione completata da `:recordLowerBound` (sottoquery) |
| 9 | feed attività (**Q1**) | `listCoachRecentActivity(coachId)` esistente | invariato (`LIMIT 8`) |

Totale **nove statement** fissi (R4 ne fa sei). `:recordLowerBound` = mezzanotte UTC di `oggi − 7` (stesso trucco del limite largo di R4: il filtro esatto lo fa `recentPersonalRecords` sui giorni di Roma). La query 8 legge lo storico intero degli atleti attivi nella settimana: nessun indice utile oggi su `workout_sessions (user_id, completed_at)` (D8 di R4). Si misura con `EXPLAIN ANALYZE` con le stesse soglie di R4; se serve, indice in una migrazione a sé.

Per non duplicare le sei query, `listCoachClientRows` si divide in un caricamento comune (le sei query) usato sia da `/coach/clients` sia da `loadCoachToday`; la forma della risposta di `/coach/clients` non cambia salvo `risk`. Il nome dell'eventuale funzione comune segue la regola dei nomi nuovi (proposta al momento della PR).

### POST `/coach/today/:athleteId/handled`

`findCoachAthleteLink` (1) + le query 1–8 di sopra (senza la 9) per calcolare la riga + transazione con `FOR SHARE` e upsert (2). Numero fisso; calcolare per tutto il coach e prendere un cliente costa come una GET e evita una seconda versione delle query filtrata per atleta. DELETE: `findCoachAthleteLink` + `DELETE` (2).

### GET `/coach/clients`

Invariato: sei query. `risk` in memoria.

## Sicurezza e permessi

- Ogni query filtra per `coach_id` del coach autenticato, direttamente o con join su `coach_athletes`; la query dei record passa dal collegamento, quindi nessun set di atleti di altri coach.
- `:athleteId` di un atleta non collegato → 404, mai 403 (non riveliamo che esiste), come R2/R4.
- `severityAtHandle` è calcolata dal server: un client non può nascondere una riga `high` dichiarandola `low`.
- Nuovo dato esposto: nomi degli esercizi con record dei propri clienti, già visibili in `/coach/analytics/clients/:athleteId`. Nessun importo nelle risposte.
- Gli atleti non hanno accesso (`requireRole("coach")`).

## Impatto per pacchetto

| Pacchetto | R5 |
| --- | --- |
| `be/` | `churnRisk.ts` + test; `coachToday.ts` + test; `coachTodayAccess.ts`; route `GET /today`, `POST` e `DELETE /today/:athleteId/handled` (**N8**); `risk` in `listCoachClientRows`; query della scheda attiva con `expires_at`; schema `coachinboxhandled.ts` + `0016`; e2e su `smoke_test` (es. `be/src/e2e/oggi.e2e.test.ts`). `GET /coach/dashboard`, `buildCoachAlerts`, `countPersonalRecords`, analytics: **invariati** |
| `fe/` | schemi Zod in `fe/src/api/schemas/coach.ts` (**N10**): `churnRiskSchema` (usato due volte), `coachClientListItemSchema.extend({ risk })`, `inboxItemSchema`, `coachTodaySchema` che riusa `coachDashboardActivityItemSchema`; funzioni API `getCoachToday`, `markClientHandled`, `unmarkClientHandled`; copy italiana per eventuali errori nuovi in `knownErrorMessages.ts` (nessun messaggio nuovo: `Client not found` esiste; `Invalid athlete id` resta senza traduzione di proposito, decisione del 2026-10-26, perché il pannello manda solo id ricevuti dall'API). Pagina `fe/src/pages/coach/today/` con inbox + `ActivityFeed` riusato; route `/today`, `/dashboard` → redirect a `/today`, voce di menu "Oggi" in `AppShell` (desktop e barra mobile, oggi "Dashboard"/"Home"). `useDashboard`, `KpiGrid`, `RenewalChart`, `AthletesTable` escono dalla pagina: il FE decide se cancellarli o tenerli per R8 (**non** è contratto). Link dalla riga: dettaglio cliente e, con un motivo abbonamento, tab Abbonamento (sotto-route R3). Nessun link a Clienti `?stato=` (**C6**, 2026-10-27) |
| `mobile/` | **nessuno**: `mobile/src` e `mobile/app` non chiamano nessuna route `/coach/*` (grep sotto) |
| `landing/` | nessuno |
| Dati | `0016` additiva: una tabella nuova, nessuna colonna toccata |

`GET /coach/dashboard` **resta, invariato**. Dopo R5 il pannello non lo chiama più (Oggi usa `recentActivity` di `/coach/today`), ma toglierlo è un cambio non additivo: si valuta in R8 con una decisione a parte. Nessun client in produzione oltre al pannello lo usa (il mobile non chiama `/coach/*`).

### Consumatori verificati

```
grep -rn "/coach/today\|coach/today" mobile/src mobile/app landing/src     → nessun risultato (exit 1)
grep -rn "/coach/clients\|coach/clients" mobile/src mobile/app landing/src → nessun risultato (exit 1)
grep -rn "\"/coach\|'/coach\|`/coach" mobile/src mobile/app               → nessun risultato (exit 1)
grep -rn "coach_inbox\|coachInbox\|/coach/today" be/src fe/src            → nessun risultato (exit 1): nomi liberi
grep -rn "/coach" mobile/src mobile/app                                     → solo route Expo `/(app)/settings/coach` e API atleta `/athlete/coach[/link]`
```

Consumatori web di `GET /coach/clients` oggi (compilano senza modifiche se `risk` è nello schema della lista, tipo sovrainsieme): `pages/coach/clients/`, `dashboard/api/useDashboard.ts` (esce con R5), `assignments/new/index.tsx`.

## Retrocompatibilità e rilascio

- Client vecchio + backend nuovo: `/coach/clients` con `risk` in più passa (Zod `z.object` scarta le chiavi in più); le route nuove non sono chiamate. Funziona.
- Client nuovo + backend vecchio: `/coach/today` dà 404 e la pagina Oggi (che sostituisce la dashboard come pagina d'arrivo) mostra l'errore; `coachClientsSchema` con `risk` obbligatorio rompe Clienti e "Nuova assegnazione". Stessa finestra di R4.
- Il mobile in produzione non è toccato.

Ordine di rilascio:

- [ ] **Migrazione prima del codice**: `0016` applicata sul DB di Railway prima o insieme al deploy del BE (procedura Railway fuori dal repo; checklist del devops-engineer). Senza tabella `GET /coach/today` dà 500.
- [ ] **BE prima del FE**. Se R5 è una sola PR, dopo il merge controllare che il deploy Railway sia finito e che in produzione `GET /api/coach/today` risponda e `GET /api/coach/clients` abbia `risk`; fino ad allora Pages può mostrare errori. Se si divide, la PR del backend va in produzione per prima.
- [ ] Prova reale sul pannello pubblicato: `/dashboard` porta a `/today`; Gestito nasconde la riga e "Annulla" la riporta; una riga che peggiora torna.
- Rollback: codice precedente + tabella lasciata (ignorata).

## Nomi da scegliere

Nomi nuovi non fissati dal piano. **(R)** = raccomandato e usato nel corpo.

| # | Cosa | Opzioni |
| --- | --- | --- |
| N1 | Campi top-level di `GET /coach/today` | **(R)** `items`, `handledCount`, `clientCount` · `rows`, `hiddenCount`, `totalClients` · `clients`, `handledCount`, `clientCount` |
| N2 | Identità del cliente nella riga | **(R)** `athleteId`, `athleteName`, `athleteEmail` (come `recentActivity` nella stessa risposta e `CoachAlert`) · `id`, `name`, `email` (come `/coach/clients`) · oggetto annidato `client: { id, name, email }` |
| N3 | Gravità della riga: campo, valori, tipo, costante | **(R)** `severity: "high" \| "medium" \| "low"`, tipo `InboxSeverity`, costante `INBOX_SEVERITIES` (nello schema Drizzle, come `PERIOD_UNITS`) · `severity: "high" \| "medium" \| "info"` · `priority: 3 \| 2 \| 1` (numero, colonna `smallint`) |
| N4 | Rischio: forma, tipi, `kind` dei motivi | **(R)** `risk: { level, reasons: { kind, message }[] }`, tipi `ChurnRisk`, `ChurnRiskLevel`, `ChurnRiskReason`, `ChurnRiskReasonKind`; kind `subscription_expiring`, `subscription_expired`, `low_frequency`, `no_recent_session` · stessa forma con `reasons: string[]` (solo testo; R7 dovrebbe leggere l'italiano per scegliere il messaggio WhatsApp) · kind `payment_due`, `payment_overdue`, `trains_little`, `inactive` (riusa `inactive` di `CoachAlertType`) |
| N5 | Motivi fuori dal rischio | **(R)** `alerts: { kind, message }[]`, tipi `InboxAlert`, `InboxAlertKind`; kind `program_expiring` (come `CoachAlertType`), `personal_records` · `notices` · `otherReasons` |
| N6 | Funzioni pure | **(R)** `churnRisk` (sostantivo come `trainingFrequency`), `inboxItem`, `recentPersonalRecords`, `buildInbox` · `assessChurnRisk`, `buildInboxItem`, `findRecentPersonalRecords`, `sortAndHideInbox` · `dropOutRisk`, `todayRow`, `newPersonalRecords`, `coachInbox` |
| N7 | Accesso DB di Oggi | **(R)** `be/src/services/coachTodayAccess.ts` → `loadCoachToday`, `markClientHandled`, `unmarkClientHandled` · tutto in `coachAthleteAccess.ts` (oggi 334 righe) · `coachInboxAccess.ts` → `loadInbox`, `saveHandled`, `deleteHandled` |
| N8 | Dove vivono le route | **(R)** nuovo `be/src/routes/coachtoday.ts` con `coachTodayRouter`, montato in `coach.ts` con `coachRouter.use(...)` come `coachSubscriptionsRouter` (eredita auth) · direttamente in `coach.ts` (oggi 616 righe) |
| N9 | Schema e migrazione | **(R)** `be/src/db/schema/coachinboxhandled.ts`, export `coachInboxHandled`, unique `coach_inbox_handled_coach_athlete`, migrazione `0016_pt_oggi` · stesso file, migrazione `0016_coach_inbox_handled` · file `coachinbox.ts` |
| N10 | Nomi FE | **(R)** schemi `churnRiskSchema`, `inboxItemSchema`, `coachTodaySchema` in `schemas/coach.ts`; tipi `ChurnRisk`, `InboxItem`, `CoachToday`; API `getCoachToday`, `markClientHandled`, `unmarkClientHandled`; cartella `pages/coach/today/` · file nuovo `schemas/today.ts` (con `churnRiskSchema` importato da `coach.ts`) · cartella `pages/coach/oggi/` |
| N11 | Costanti (non esportate salvo dove servono ai test) | **(R)** `RISK_EXPIRY_WINDOW_DAYS = 14`, `INACTIVE_AFTER_DAYS = 7`, `HANDLED_HIDDEN_DAYS = 7`, `PERSONAL_RECORD_WINDOW_DAYS = 7`, `PROGRAM_EXPIRING_WINDOW_DAYS = 7` · `SUBSCRIPTION_RISK_DAYS`, `NO_SESSION_DAYS`, `HANDLED_DAYS`, `RECORD_WINDOW_DAYS` |

## Domande aperte

| # | Domanda | Opzioni | Raccomandazione |
| --- | --- | --- | --- |
| Q1 | Da dove prende Oggi il feed attività? | **A** `recentActivity` dentro `GET /coach/today` (stesso tipo e stessa funzione di `/coach/dashboard`) · **B** il FE chiama anche `GET /coach/dashboard` e usa solo `recentActivity` · **C** route nuova `GET /coach/activity` | **A**: una chiamata per la pagina; B fa calcolare (e scrivere: `syncAssignmentStatusesForCoach`) tutte le statistiche che Oggi non mostra; C è una route in più per otto righe |
| Q2 | Righe nascoste e annullamento | **A** solo `handledCount` + `DELETE .../handled` per il toast "Annulla" · **B** come A più `handledItems` (le righe nascoste con `handledAt`) per una sezione "Gestiti" riapribile · **C** solo `handledCount`, nessun annullamento | **A**: annullare un clic sbagliato serve (la riga sparirebbe per 7 giorni); una sezione "Gestiti" non è nel piano e si aggiunge dopo in modo additivo |
| Q3 | Cliente che non si è mai allenato | **A** i giorni di inattività partono dal collegamento (`linkedAt`): rischio dopo 7 giorni da cliente · **B** come `buildCoachAlerts`: inattivo subito ("Nessuna sessione completata registrata") · **C** nessuna condizione di inattività finché non c'è una prima sessione | **A**: un cliente collegato ieri non è a rischio; con B ogni nuovo cliente entra in Oggi al primo giorno, con C chi non parte mai non compare |
| Q4 | Record: cosa è "lo stesso esercizio" e quanto storico | **A** `catalogId`, altrimenti nome con `trim` e minuscole; storico completo · **B** `exercises.id` come `countPersonalRecords` (lo storico riparte a ogni scheda: con "la prima volta non conta" i record quasi spariscono) · **C** come A ma storico delle ultime 52 settimane (query più leggera) | **A**: segue l'esercizio attraverso schede e revisioni; il costo si misura come le altre query (D8 di R4); C resta il ripiego se la query 8 è lenta |
| Q5 | Abbonamento scaduto nel rischio e nell'ordine | **A** uno scaduto soddisfa sempre "scade entro 14 g" (anche da mesi): da solo rischio `medium`, e nell'ordinamento sale in cima ai `medium` per `daysLeft` · **B** lo scaduto ha un motivo pagamento a parte con gravità `high` (sopra il rischio medio) · **C** lo scaduto conta solo per i primi 14 giorni dopo la scadenza | **A**: resta la regola del piano senza un livello in più, e l'insoluto non blocca nulla; B mette chi non ha pagato alla pari del rischio alto; C fa sparire l'insoluto vecchio da Oggi |

### Note non bloccanti

1. `buildCoachAlerts` scrive "Scheda in scadenza tra 1 giorni" in analytics. Oggi usa "domani"; correggere analytics è fuori scope di R5 (va chiesto a parte).
2. `program_expiring` resta anche se il coach ha già programmato la scheda successiva (regola di `buildCoachAlerts`). Toglierlo in quel caso richiede di leggere le schede future nella query 6: possibile dopo, senza cambiare forma.
3. "Peggiora" guarda solo la gravità: un motivo nuovo della stessa gravità resta nascosto fino al settimo giorno (regola del piano).

## Testo proposto per il Decisions log di `WORKBOOK.md`

> 2026-10-27 — R5 Oggi e rischio abbandono: contratto in `docs/contracts/pt-oggi.md`. `GET /coach/today` → `{ clientCount, handledCount, items, recentActivity }`, una riga per cliente collegato non in pausa con `severity` (`high` / `medium` / `low`), `risk { level, reasons[{ kind, message }] }` e `alerts` (`program_expiring`, `personal_records`), ordinate per gravità, scadenza abbonamento, giorni senza sessione, nome. Rischio in `churnRisk.ts`: abbonamento entro 14 g (scaduto compreso) e attività (frequenza < 50% o 7+ g senza sessione, dal collegamento se mai allenato): entrambe alto, una medio. `POST`/`DELETE /coach/today/:athleteId/handled` (204, idempotenti) su `coach_inbox_handled` (`0016`, una riga per coppia, FK composta su `coach_athletes` con cascata): nascosta 7 giorni di Roma salvo gravità maggiore di `severityAtHandle`, calcolata dal server. `GET /coach/clients` aggiunge `risk`. `GET /coach/dashboard` resta invariato. Al rilascio `0016` e BE prima del FE | Una chiamata per la pagina, tutto additivo, il mobile non usa `/coach/*`. Lo stato pagamento è già una condizione del rischio, quindi non si ripete; i `kind` permettono a R7 di scegliere il testo WhatsApp senza leggere l'italiano. La FK sul collegamento pulisce i Gestito allo scollegamento senza codice nei due chiamanti |
