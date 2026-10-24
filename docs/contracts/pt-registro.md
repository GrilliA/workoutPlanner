# Contratto R2 — Registro pagamenti PT (listino, abbonamento, pagamenti, pausa)

Stato: **approvato il 2026-10-23** (Contract Gate di R2), con la regola della pausa corretta e il contatore `revision`.
Piano: [`docs/plans/PT-registro.md`](../plans/PT-registro.md). Schema R1: `be/src/db/schema/{coachoffers,clientsubscriptions,subscriptionpayments,subscriptionpauses}.ts`. Logica pura: `be/src/services/subscription.ts`.

I nomi segnati con **(D1)**, **(D2)**, **(D3)** sono quelli delle [decisioni](#decisioni-prese): in tutti e tre i casi è stata scelta l'opzione A.

## Regole comuni

- Tutte le route stanno sotto `/api/coach`, dietro `requireAuth` + `requireRole("coach")` (401 / 403 come oggi).
- `:athleteId`, `:id` non interi o `< 1` → 400 (`"Invalid athlete id"`, `"Invalid offer id"`, `"Invalid payment id"`).
- Atleta non collegato al coach (`coach_athletes`) → 404 `"Client not found"`, come le route clienti esistenti. **Eccezione per gli ex clienti** (decisione 2026-10-23, review di sicurezza F1): `GET .../subscription` e `GET .../payments` rispondono anche senza collegamento se esiste la riga `client_subscriptions` della coppia `(coachId, athleteId)`, così il coach conserva storico e insoluto di chi si è scollegato. Senza collegamento e senza riga → 404 `"Client not found"`. Anteprima e scritture richiedono sempre il collegamento.
- Body che non è un oggetto JSON (assente, `null`, array, primitivo) → 400 `"Invalid request body"`. I campi sconosciuti vengono ignorati. Vale anche per il JSON che il parser rifiuta (malformato, o primitivo in modalità strict): l'error handler globale di `app.ts` lo traduce in 400 `"Invalid request body"` per tutte le route, e non scrive mai il body nei log. Gli altri errori del parser tengono il loro status con un messaggio fisso: 413 `"Request body too large"`, 415 `"Unsupported request body encoding"`.
- Errori: sempre `{ "error": string }` in inglese; la copy italiana sta nel client.
- **Ordine dei controlli** (determina quale errore esce per primo): id 400 → `Client not found` 404 → body 400 → risorsa 404 → stato 409.
- Mai 500 per input: ogni valore che arriva al DB è già validato (range di interi, date, enum, lunghezze).
- **Date**: stringhe `YYYY-MM-DD` di calendario valide (`isValidIsoDate`) e comprese tra `2000-01-01` e `2099-12-31`; fuori range → stesso errore del formato (`"<field> must be YYYY-MM-DD"`). "Oggi" è `todayInRome()`.
- Una data calcolata (`paidThrough` dopo pagamento o pausa) oltre `2199-12-31` → 400 `"Resulting paidThrough is out of range"`. Il motivo: tanti pagamenti da 12 × 52 settimane porterebbero `toISOString()` oltre l'anno 9999, con una stringa che Postgres rifiuta.
- **Soldi**: centesimi interi `0..1_000_000`. `periodCount` `1..52`. `periods` `1..12`.
- **Concorrenza**: ogni scrittura su abbonamento, pagamenti o pause apre una transazione e legge la riga `client_subscriptions` della coppia con `SELECT ... FOR UPDATE`. Tutti i controlli di stato (chiuso, ultimo pagamento, pausa attiva, revisione) si fanno **dopo** il lock, sui valori riletti. **Ordine dei lock** (F3): dentro la stessa transazione si legge prima la riga `coach_athletes` della coppia con `FOR SHARE` (manca → 404 `"Client not found"`), poi l'abbonamento con `FOR UPDATE`. Lo scollegamento prende `FOR UPDATE` sul collegamento prima di chiudere l'abbonamento: così una scrittura e uno scollegamento concorrenti non lasciano un abbonamento aperto a un ex cliente, nemmeno alla creazione.
- **Additivo**: nessuna route esistente cambia forma. `GET /coach/clients`, `GET /coach/clients/:athleteId` e `GET /athlete/home` restano identiche in R2 (si estendono in R4 e R6). L'app mobile in produzione non è toccata.
- Nessuna paginazione: un cliente ha al massimo qualche decina di pagamenti l'anno, un coach qualche decina di offerte.

## Endpoint

| Metodo | Path | Successo | Note |
| --- | --- | --- | --- |
| GET | `/coach/offers` | 200 `Offer[]` | archiviate incluse |
| POST | `/coach/offers` | 201 `Offer` | |
| PATCH | `/coach/offers/:id` | 200 `Offer` | modifica e `archived` |
| GET | `/coach/clients/:athleteId/subscription` | 200 `SubscriptionDetail` | **(D1)** |
| PUT | `/coach/clients/:athleteId/subscription` | 201 / 200 `SubscriptionDetail` | crea / modifica |
| GET | `/coach/clients/:athleteId/payments/preview?paidOn=&periods=` | 200 `PaymentPreview` | **(D1)** |
| GET | `/coach/clients/:athleteId/payments` | 200 `Payment[]` | `[]` senza abbonamento |
| POST | `/coach/clients/:athleteId/payments` | 201 `{ payment, subscription, start }` | |
| DELETE | `/coach/clients/:athleteId/payments/:id` | 204 | solo l'ultimo |
| POST | `/coach/clients/:athleteId/pause` | 201 `{ pause, subscription }` | |
| DELETE | `/coach/clients/:athleteId/pause` | 204 | annulla o termina ieri |

Niente `DELETE /coach/offers/:id`: si archivia.

## Tipi di risposta

```ts
type PeriodUnit = "month" | "week";
type PaymentMethod = "cash" | "bank_transfer" | "satispay" | "paypal" | "other";
type PaymentStart = "paid_through" | "paid_on";
type SubscriptionStatus = "active" | "expiring" | "expired" | "paused" | "ended";

type Offer = {
  id: number;
  name: string;
  priceCents: number;
  periodUnit: PeriodUnit;
  periodCount: number;
  isRecurring: boolean;
  archivedAt: string | null; // ISO timestamp
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
};

type Subscription = {
  id: number;
  athleteId: number;
  offerId: number | null;    // null solo se l'offerta non esiste più (FK on delete set null)
  agreedPriceCents: number;
  periodUnit: PeriodUnit;
  periodCount: number;
  isRecurring: boolean;
  startedOn: string;         // YYYY-MM-DD
  paidThrough: string;       // YYYY-MM-DD, ultimo giorno pagato (incluso)
  billingDay: number;        // 1..31
  endedOn: string | null;    // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
};

type SubscriptionState = {
  status: SubscriptionStatus;
  daysLeft: number;          // giorni da oggi a paidThrough, negativo se scaduto
  pausedUntil: string | null;// endsOn della pausa in corso, solo con status "paused"
};

type Pause = {
  id: number;
  startsOn: string;
  endsOn: string;
  canRemove: boolean;        // DELETE /pause risponderebbe 204 adesso
  createdAt: string;
};

type SubscriptionDetail = {
  subscription: Subscription;
  state: SubscriptionState;
  activePause: Pause | null; // pausa non annullata con endsOn >= oggi (futura o in corso)
};

type Payment = {
  id: number;
  amountCents: number;
  paidOn: string;
  method: PaymentMethod;
  periods: number;
  coversFrom: string;
  coversTo: string;
  note: string | null;
  canUndo: boolean;          // DELETE /payments/:id risponderebbe 204 adesso
  createdAt: string;
};
```

Il nome dell'offerta non è nell'abbonamento: il client lo prende da `GET /coach/offers`, che include le archiviate apposta. Le colonne interne della 0015 (`revision`, `previous_*`) non escono mai nelle risposte: `canUndo` e `canRemove` le riassumono.

## Listino

### GET `/coach/offers`

200 `Offer[]` del coach, ordinate: non archiviate prima, poi `name` crescente, poi `id` crescente.

### POST `/coach/offers`

```json
{ "name": "Coaching mensile", "priceCents": 8000, "periodUnit": "month", "periodCount": 1, "isRecurring": true }
```

| Campo | Tipo | Obbligatorio | Regola |
| --- | --- | --- | --- |
| `name` | string | sì | trim, 1..100 caratteri |
| `priceCents` | integer | sì | 0..1_000_000 |
| `periodUnit` | `"month" \| "week"` | sì | |
| `periodCount` | integer | sì | 1..52 |
| `isRecurring` | boolean | no | default `true` |

201 `Offer`.

### PATCH `/coach/offers/:id`

Stessi campi di POST, tutti facoltativi, più `archived: boolean`. `archived: true` imposta `archivedAt = now()` se era `null` (idempotente: un'offerta già archiviata tiene la data); `archived: false` lo riporta a `null`. Si può modificare anche un'offerta archiviata. Modificare l'offerta **non** tocca gli abbonamenti che la puntano (prezzo e periodo sono copiati).

200 `Offer`.

### Errori del listino

| Codice | `error` | Quando |
| --- | --- | --- |
| 400 | `Invalid request body` | body non oggetto |
| 400 | `Invalid offer id` | `:id` non intero positivo |
| 400 | `name is required` | assente o vuoto dopo il trim |
| 400 | `name must be at most 100 characters` | |
| 400 | `priceCents must be an integer between 0 and 1000000` | |
| 400 | `periodUnit must be month or week` | |
| 400 | `periodCount must be an integer between 1 and 52` | |
| 400 | `isRecurring must be a boolean` | |
| 400 | `archived must be a boolean` | solo PATCH |
| 400 | `At least one field is required` | PATCH senza campi noti |
| 404 | `Offer not found` | PATCH su offerta inesistente o di un altro coach |

## Abbonamento

### GET `/coach/clients/:athleteId/subscription` (D1, opzione A)

200 sempre, se il cliente è collegato:

```json
{
  "subscription": { "id": 7, "athleteId": 42, "offerId": 3, "agreedPriceCents": 8000, "periodUnit": "month", "periodCount": 1, "isRecurring": true, "startedOn": "2026-09-17", "paidThrough": "2026-11-17", "billingDay": 17, "endedOn": null, "createdAt": "…", "updatedAt": "…" },
  "state": { "status": "active", "daysLeft": 25, "pausedUntil": null },
  "activePause": null
}
```

Senza abbonamento: `{ "subscription": null, "state": null, "activePause": null }`. Il tipo esatto è quindi `SubscriptionDetail | { subscription: null; state: null; activePause: null }`. Con abbonamento chiuso: `state.status = "ended"`, e se esiste ancora una pausa non annullata con `endsOn >= oggi` viene restituita con `canRemove: false`.

### PUT `/coach/clients/:athleteId/subscription`

Crea l'abbonamento se la coppia coach-atleta non ne ha uno (**201**), altrimenti lo modifica (**200**). La riga è una sola per coppia (`client_subscriptions_coach_athlete`): chiudere e riprendere avviene sulla stessa riga.

```json
{ "offerId": 3, "agreedPriceCents": 7000, "startedOn": "2026-09-17", "paidThrough": "2026-10-17", "endedOn": null }
```

| Campo | Tipo | Creazione | Modifica |
| --- | --- | --- | --- |
| `offerId` | integer ≥ 1 | **obbligatorio** | facoltativo; diverso dall'attuale = cambio offerta |
| `agreedPriceCents` | integer 0..1_000_000 | default `offer.priceCents` | facoltativo |
| `startedOn` | date | **obbligatorio** | facoltativo |
| `paidThrough` | date | default `startedOn` | **non modificabile**: ammesso solo uguale al valore salvato |
| `endedOn` | date \| null | default `null` | string = chiude (anche futura), `null` = riprende, assente = invariato |

Regole:

1. Creazione: `periodUnit`, `periodCount`, `isRecurring` copiati dall'offerta; `agreedPriceCents` dal body o dall'offerta; `billingDay = giorno del mese di paidThrough`; `revision = 0`.
2. Cambio offerta (`offerId` presente e diverso dall'attuale): ricopia `periodUnit`, `periodCount`, `isRecurring`; `agreedPriceCents` = body o prezzo della nuova offerta. **Non** tocca `startedOn` né `paidThrough`. Se `periodUnit` cambia: `billingDay = giorno di paidThrough` e la revisione avanza (vedi [Ordine delle operazioni](#ordine-delle-operazioni)).
3. `offerId` uguale all'attuale: nessuna ricopia, anche se l'offerta nel frattempo è stata archiviata (cambiare solo il prezzo resta possibile).
4. Offerta archiviata usata in creazione o in un cambio offerta → 409.
5. Date: `paidThrough >= startedOn`; `endedOn >= startedOn` (valutati sul risultato finale: body sopra i valori salvati).
6. Il PUT è ammesso anche su abbonamento chiuso (serve a riprenderlo).
7. Due PUT di creazione in parallelo: il secondo prende la unique violation (`23505`) e risponde 409, mai 500.

Risposta: `SubscriptionDetail` (201 o 200).

| Codice | `error` | Quando |
| --- | --- | --- |
| 400 | `Invalid request body` | |
| 400 | `At least one field is required` | modifica senza campi noti |
| 400 | `offerId is required` | creazione senza `offerId` |
| 400 | `Invalid offer id` | `offerId` non intero positivo |
| 400 | `agreedPriceCents must be an integer between 0 and 1000000` | |
| 400 | `startedOn must be YYYY-MM-DD` | anche se assente in creazione |
| 400 | `paidThrough must be YYYY-MM-DD` | |
| 400 | `endedOn must be YYYY-MM-DD or null` | |
| 400 | `paidThrough must be on or after startedOn` | |
| 400 | `endedOn must be on or after startedOn` | |
| 400 | `paidThrough cannot be changed after creation` | modifica con valore diverso dal salvato |
| 404 | `Offer not found` | offerta inesistente o di un altro coach |
| 409 | `Offer is archived` | regola 4 |
| 409 | `Subscription already exists` | creazione concorrente |

### Stato calcolato

`subscriptionState({ paidThrough, endedOn, today, activePause })`, nell'ordine:

1. `endedOn !== null && endedOn <= today` → `ended` (`pausedUntil: null`).
2. pausa in corso (`startsOn <= today <= endsOn`) → `paused`, `pausedUntil = endsOn`.
3. `daysLeft < 0` → `expired`; `daysLeft <= 7` → `expiring`; altrimenti `active`.

`daysLeft = paidThrough − today` in giorni, calcolato anche per `ended` e `paused`. Con `endedOn` futuro lo stato segue le regole 2-3 e le scritture sono ammesse.

## Pagamenti

### GET `/coach/clients/:athleteId/payments/preview?paidOn=YYYY-MM-DD&periods=N` (D1, opzione A)

Anteprima senza effetti per il dialog "Registra pagamento". `periods` facoltativo (default 1, stringa di sole cifre, 1..12). Ammessa anche su abbonamento chiuso (è una lettura).

```json
{
  "paidOn": "2026-10-22",
  "periods": 1,
  "suggestedStart": "paid_through",
  "suggestedAmountCents": 8000,
  "options": [
    { "start": "paid_through", "coversFrom": "2026-10-17", "coversTo": "2026-11-17", "isAllowed": true },
    { "start": "paid_on", "coversFrom": "2026-10-22", "coversTo": "2026-11-22", "isAllowed": true }
  ]
}
```

- `suggestedStart = suggestedPaymentStart(...)` (R1, invariato).
- `suggestedAmountCents = agreedPriceCents × periods` (solo un suggerimento: il POST vuole `amountCents` esplicito).
- `options` contiene sempre due voci, `paid_through` per prima. `isAllowed: false` quando quell'inizio accorcerebbe il pagato (`coversTo < paidThrough` attuale): succede solo per `paid_on`.

| Codice | `error` |
| --- | --- |
| 400 | `paidOn must be YYYY-MM-DD` · `paidOn must not be in the future` · `periods must be an integer between 1 and 12` |
| 404 | `Subscription not found` |

### GET `/coach/clients/:athleteId/payments`

200 `Payment[]` ordinati per `paidOn` decrescente, poi `id` decrescente. `[]` se il cliente non ha abbonamento. Al massimo una voce ha `canUndo: true`.

### POST `/coach/clients/:athleteId/payments`

```json
{ "amountCents": 8000, "paidOn": "2026-10-22", "method": "satispay", "periods": 1, "start": "paid_through", "note": null }
```

| Campo | Tipo | Obbligatorio | Regola |
| --- | --- | --- | --- |
| `amountCents` | integer | sì | 0..1_000_000 |
| `paidOn` | date | sì | non nel futuro |
| `method` | `PaymentMethod` | sì | |
| `periods` | integer | no | default 1, 1..12 |
| `start` | `PaymentStart` | no | default `suggestedPaymentStart(...)` |
| `note` | string \| null | no | trim; vuota → `null`; ≤ 500 caratteri dopo il trim |

Effetto, in un'unica transazione con lock:

1. `coverageForPayment({ paidThrough, paidOn, start, period, periods })` → `coversFrom`, `coversTo`, `billingDay`.
2. `start = "paid_on"` e `coversTo < paidThrough` → 400 (accorcerebbe il pagato).
3. Inserisce il pagamento con `previous_paid_through` e `previous_billing_day` = valori dell'abbonamento **prima** del pagamento e `revision = subscription.revision + 1`.
4. Aggiorna l'abbonamento: `paidThrough = coversTo`, `billingDay`, `revision + 1`, `updatedAt`.

201:

```json
{ "payment": { "id": 31, "amountCents": 8000, "paidOn": "2026-10-22", "method": "satispay", "periods": 1, "coversFrom": "2026-10-17", "coversTo": "2026-11-17", "note": null, "canUndo": true, "createdAt": "…" },
  "subscription": { "…": "Subscription aggiornata" },
  "start": "paid_through" }
```

| Codice | `error` | Quando |
| --- | --- | --- |
| 400 | `Invalid request body` | |
| 400 | `amountCents must be an integer between 0 and 1000000` | |
| 400 | `paidOn must be YYYY-MM-DD` | |
| 400 | `paidOn must not be in the future` | `paidOn > oggi` |
| 400 | `method must be one of cash, bank_transfer, satispay, paypal, other` | |
| 400 | `periods must be an integer between 1 and 12` | |
| 400 | `start must be paid_through or paid_on` | |
| 400 | `note must be a string or null` | |
| 400 | `note must be at most 500 characters` | |
| 400 | `Payment would shorten the paid period` | regola 2 |
| 400 | `Resulting paidThrough is out of range` | oltre `2199-12-31` |
| 404 | `Subscription not found` | |
| 409 | `Subscription has ended` | `endedOn <= oggi` |

### DELETE `/coach/clients/:athleteId/payments/:id`

Annulla un errore di battitura. Controlli, nell'ordine:

1. Pagamento inesistente, di un'altra coppia, o cliente senza abbonamento → 404 `"Payment not found"`.
2. Abbonamento chiuso → 409 `"Subscription has ended"`.
3. Non è il pagamento con `id` massimo dell'abbonamento → 409 `"Only the latest payment can be undone"`.
4. `payment.revision !== subscription.revision` (dopo è successo altro: pausa creata o terminata, cambio di `periodUnit`) → 409 `"Only the latest change can be undone"`.
5. `previous_paid_through` o `previous_billing_day` `null` (righe create prima della 0015, solo nei DB di sviluppo) → 409 `"Only the latest change can be undone"`.

Effetto: `paidThrough = previous_paid_through`, `billingDay = previous_billing_day`, `revision = payment.revision − 1`, poi cancella la riga. 204.

`canUndo` nel GET è `true` esattamente quando i controlli 2-5 passerebbero.

## Pausa

### POST `/coach/clients/:athleteId/pause`

```json
{ "startsOn": "2026-11-01", "endsOn": "2026-11-30" }
```

| Regola | Errore |
| --- | --- |
| date valide | 400 `startsOn must be YYYY-MM-DD` · `endsOn must be YYYY-MM-DD` |
| `endsOn >= startsOn` | 400 `endsOn must be on or after startsOn` |
| `startsOn >= oggi − 31 g` | 400 `startsOn must be at most 31 days ago` |
| durata `endsOn − startsOn + 1 <= 180` | 400 `Pause must be at most 180 days` |
| `startsOn >= subscription.startedOn` | 400 `startsOn must be on or after startedOn` |
| abbonamento esistente | 404 `Subscription not found` |
| abbonamento aperto | 409 `Subscription has ended` |
| nessuna pausa non annullata con `endsOn >= oggi` | 409 `Subscription already has an active pause` |
| nessuna sovrapposizione con pause non annullate (anche passate) | 409 `Pause overlaps another pause` |
| risultato entro `2199-12-31` | 400 `Resulting paidThrough is out of range` |

Effetto: salva sulla pausa `previous_paid_through`, `previous_billing_day` e `revision = subscription.revision + 1`; applica `applyPause` (sotto) all'abbonamento e avanza la revisione. 201 `{ "pause": Pause, "subscription": Subscription }`.

Una pausa tutta nel passato (entro 31 g) è ammessa: registra a posteriori un infortunio. Non si potrà togliere (vedi DELETE) — vedi le note in fondo.

### Quanto sposta la pausa

Giorni pagati che cadono nella pausa: `k = max(0, min(endsOn, paidThrough) − startsOn + 1)`. Questi `k` giorni si godono **dopo** la pausa, da `endsOn + 1`. Quindi:

- `paidThrough < startsOn` → `k = 0`: nessuno spostamento, `billingDay` invariato. La pausa vale comunque per lo stato `paused`.
- `paidThrough >= startsOn` → nuova scadenza `paidThrough + durata della pausa`, `billingDay` = giorno della nuova scadenza.

Il secondo caso copre anche `paidThrough` dentro la pausa: `endsOn + k = paidThrough + durata`. Spostare la scadenza di `k` giorni invece della durata la lascerebbe dentro la pausa e il cliente perderebbe i giorni pagati (verificato: scadenza 05/11, pausa 01/11–30/11 → `+k` dà 10/11, la regola giusta dà 05/12, cioè 5 giorni pagati dall'01/12 al 05/12). Rispetto a R1 cambia solo il caso `paidThrough < startsOn`, che oggi regala l'intera durata.

### DELETE `/coach/clients/:athleteId/pause`

Agisce sulla pausa attiva (non annullata, `endsOn >= oggi`; ce n'è al massimo una). Nell'ordine:

1. Nessun abbonamento → 404 `"Subscription not found"`.
2. Abbonamento chiuso → 409 `"Subscription has ended"`.
3. Nessuna pausa attiva: se esiste almeno una pausa non annullata → 409 `"Pause has already ended"`; altrimenti 404 `"No active pause"`.
4. `pause.revision !== subscription.revision` (dopo c'è un pagamento, un'altra pausa o un cambio di `periodUnit`) → 409 `"Only the latest change can be undone"`.
5. `previous_*` `null` (righe pre-0015) → 409 `"Only the latest change can be undone"`.

Effetto:

- **Pausa futura o che inizia oggi** (`startsOn >= oggi`): annullata per intero. `cancelledAt = now()`, `paidThrough = previous_paid_through`, `billingDay = previous_billing_day`, `subscription.revision = pause.revision − 1`.
- **Pausa in corso** (`startsOn < oggi <= endsOn`): termina ieri. `endsOn = oggi − 1`; `applyPause` rieseguita sui valori `previous_*` con la pausa accorciata; `subscription.revision + 1` e `pause.revision` = nuovo valore. La scadenza torna indietro dei giorni di pausa non goduti (`endsOn originale − oggi + 1`) se la pausa aveva spostato qualcosa, altrimenti resta. Esempio: precedente 05/11, pausa 01/11–30/11, oggi 10/11 → pausa 01/11–09/11, scadenza 14/11.

204. `canRemove` è `true` esattamente quando i controlli 2-5 passerebbero.

## Ordine delle operazioni

"Dopo" si decide con un **contatore di revisione** per abbonamento, non con timestamp: `now()` in Postgres è l'ora d'inizio della transazione, e una transazione partita prima ma rimasta in attesa del lock può scrivere dopo con un'ora precedente. Gli id di pagamenti e pause sono sequenze separate e non si confrontano.

- `client_subscriptions.revision` parte da 0. Ogni pagamento e pausa salva nella propria `revision` il valore che ha scritto.
- **Avanzano la revisione (+1)**: POST pagamento, POST pausa, pausa in corso terminata ieri, PUT che cambia `periodUnit` (cambia `billingDay`, e ripristinare un `billingDay` precedente lo renderebbe incoerente), PUT che cambia `startedOn` (un annullamento successivo potrebbe riportare `paidThrough` prima del nuovo inizio e violare `client_subscriptions_paid_through_check`).
- **Tornano indietro (−1)**: DELETE dell'ultimo pagamento, DELETE di una pausa futura (annullamento per intero). Sono annullamenti esatti, quindi l'operazione precedente torna "ultima" e si può annullare a sua volta.
- **Non toccano la revisione**: PUT di prezzo, offerta senza cambio di `periodUnit`, `endedOn`; scollegamento.
- Una riga si può annullare/togliere solo se `riga.revision === subscription.revision`, sotto lock.

Esempio: P1 (rev 1) → P2 (rev 2) → DELETE P2 (rev 1) → pausa A (rev 2) → DELETE P1: 409 → DELETE pausa A futura (rev 1) → DELETE P1: 204.

Una pausa annullata conserva la sua `revision`, che può ripetersi in una riga successiva: non è un problema perché le pause annullate non sono mai bersaglio di un controllo.

## Modello dati — migrazione 0015 (additiva)

Nomi raccomandati (D2, opzione A):

```sql
ALTER TABLE "client_subscriptions" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;
ALTER TABLE "subscription_payments" ADD COLUMN "previous_paid_through" date;
ALTER TABLE "subscription_payments" ADD COLUMN "previous_billing_day" integer;
ALTER TABLE "subscription_payments" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;
ALTER TABLE "subscription_pauses" ADD COLUMN "previous_paid_through" date;
ALTER TABLE "subscription_pauses" ADD COLUMN "previous_billing_day" integer;
ALTER TABLE "subscription_pauses" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_previous_billing_day_check" CHECK ("subscription_payments"."previous_billing_day" BETWEEN 1 AND 31);
ALTER TABLE "subscription_pauses" ADD CONSTRAINT "subscription_pauses_previous_billing_day_check" CHECK ("subscription_pauses"."previous_billing_day" BETWEEN 1 AND 31);
```

- `previous_*` nullable come richiesto: le righe R1 già presenti nei DB di sviluppo non hanno valori; il codice R2 le scrive sempre. Una riga con `previous_*` null non è annullabile.
- Sulla pausa si salva la **scadenza precedente**, non lo spostamento in giorni: è la stessa coppia del pagamento, ripristinare è uguale nei due casi, e terminare in anticipo è `applyPause` sui valori precedenti. Con la regola della revisione le due forme sono equivalenti (D2 opzione B salva lo spostamento, come chiedeva il requisito).
- Nessun indice nuovo: "una pausa attiva" dipende da oggi e non è esprimibile come vincolo; si garantisce sotto lock.
- Il nome della costante del check va sotto i 63 caratteri (come `subscription_payments_subscription_id_fk` in R1): quelli sopra sono 48 e 46.

**Rollback**: le migrazioni Drizzle vanno solo avanti. R1 e R2 non sono in produzione, quindi 0014 e 0015 si applicano insieme al primo deploy. Tornare al codice precedente lascia le colonne: sono nullable o con default, il codice vecchio le ignora. Se servisse toglierle: una 0016 con `DROP CONSTRAINT` dei due check e `DROP COLUMN` delle sette colonne (perde solo i dati di annullamento). Verifica prima del merge: migrazioni da zero su `smoke_test` ricreato + `drizzle-kit check`.

## Logica pura (`be/src/services/subscription.ts`)

| Funzione | Oggi (R1) | R2 |
| --- | --- | --- |
| `subscriptionState` | `({ paidThrough, today, activePause }) → SubscriptionState` | `({ paidThrough, endedOn, today, activePause })`; `SubscriptionStatus` aggiunge `"ended"`, controllato per primo |
| `applyPause` | `(paidThrough: string, pause) → { paidThrough, billingDay }`, sposta sempre della durata | `(input: { paidThrough: string; billingDay: number; pause: PauseDates }) → { paidThrough: string; billingDay: number }`; sposta della durata solo se `paidThrough >= pause.startsOn`, altrimenti restituisce i valori ricevuti |
| `addPeriods`, `suggestedPaymentStart`, `coverageForPayment`, `pauseLengthDays` | | invariati |
| anteprima pagamento (D3) | — | `paymentPreview(input: { paidThrough, paidOn, period: BillingCycle, periods }) → { suggestedStart, options: { start, coversFrom, coversTo, isAllowed }[] }`; `isAllowed = coversTo >= paidThrough`. Il POST la riusa per la regola "accorcerebbe" |

Terminare una pausa in anticipo non richiede una funzione nuova: `applyPause({ paidThrough: pause.previousPaidThrough, billingDay: pause.previousBillingDay, pause: { startsOn, endsOn: dayBefore(today) } })`. Annullare è la copia dei valori `previous_*`.

Test da aggiungere in `subscription.test.ts`: stato `ended` (oggi, passato, futuro → non ended); `applyPause` con scadenza prima, dentro e dopo la pausa e con scadenza = `startsOn`; termine anticipato (esempio 05/11 → 14/11); `paymentPreview` con `paid_on` non ammesso. Il test R1 "moves paid-through forward" resta valido (scadenza dopo l'inizio).

## Scollegamento (`unlinkCoachAthlete`)

Nella transazione esistente, prima di cancellare `coach_athletes`:

1. `SELECT ... FOR UPDATE` dell'abbonamento della coppia.
2. Se esiste ed è aperto (`endedOn` null o `> oggi`): `endedOn = max(oggi, startedOn)`, `updatedAt = now()`. Il `max` serve al vincolo `client_subscriptions_ended_on_check` se l'abbonamento parte in futuro: senza, lo scollegamento darebbe 500.
3. Pause e pagamenti restano come sono; la revisione non cambia.

Impatto:

- Vale per entrambi i chiamanti: `DELETE /coach/clients/:athleteId` e lo scollegamento lato atleta (`coachInvite.unlinkAthleteFromCoach`). Nessuna risposta cambia forma.
- Dopo lo scollegamento `GET .../subscription` e `GET .../payments` continuano a rispondere (stato `ended`, storico, insoluto); anteprima e scritture rispondono 404 `"Client not found"`. La riga resta per Business (R8: clienti persi per `endedOn`).
- Un abbonamento che parte nel futuro riceve `endedOn = startedOn`: fino a quel giorno lo stato calcolato non è ancora `ended`. Per un ex cliente (nessun collegamento) `canUndo` e `canRemove` sono comunque `false`, perché le scritture rispondono 404.
- Se l'atleta si ricollega allo stesso coach, `GET .../subscription` mostra l'abbonamento `ended`; `PUT { "endedOn": null }` lo riprende sulla stessa riga, con la vecchia scadenza (di solito il primo pagamento proporrà `paid_on`).
- Il lock sul collegamento ordina lo scollegamento rispetto a una scrittura concorrente: la scrittura che arriva dopo non trova più il collegamento e prende 404 `"Client not found"`; quella che arriva prima finisce, e poi lo scollegamento chiude l'abbonamento.

## Sicurezza e permessi

- Ogni query filtra per `coachId` dell'utente autenticato; l'abbonamento si trova sempre per coppia `(coachId, athleteId)`, mai per id dal client. Un `:id` di pagamento appartenente a un'altra coppia dà 404 come se non esistesse.
- `offerId` di un altro coach → 404 `"Offer not found"` (non 403: non riveliamo che esiste).
- Gli atleti non hanno accesso a nessuna di queste route (`requireRole("coach")`); la loro vista arriva in R6 senza prezzi.

## Impatto per pacchetto

| Pacchetto | R2 | Dopo |
| --- | --- | --- |
| `be/` | route, validazione, accesso DB, 0015, `applyPause`/`subscriptionState`, unlink | |
| `fe/` | nessuno | R3/R4: schemi Zod in `fe/src/api/schemas/` da questo contratto |
| `mobile/` | nessuno | R6 estende `/athlete/home` in modo additivo |
| Rilascio | 0014 + 0015 al primo deploy di R2 su Railway; nessun client in produzione chiama queste route | |

## Decisioni prese

Scelte dall'utente il 2026-10-23: **D1-A**, **D2-A**, **D3-A** con `paymentPreview`. Le note in fondo restano come raccomandate. Le opzioni scartate restano qui sotto come riferimento.

### D1 — Forma della lettura abbonamento e dell'anteprima

| Opzione | Lettura | Anteprima |
| --- | --- | --- |
| **A (raccomandata)** | `GET .../subscription` → 200 sempre, `{ subscription, state, activePause }` con `null` senza abbonamento | `GET .../payments/preview?paidOn=&periods=` |
| B | `GET .../subscription` → 404 `"Subscription not found"` senza abbonamento; corpo piatto `{ ...Subscription, state, activePause }` | `POST .../payments/preview` con lo stesso body del POST pagamento (dry run) |
| C | come A | dentro la stessa GET: `GET .../subscription?paidOn=&periods=` aggiunge `paymentPreview` |

Perché A: "senza abbonamento" è uno stato normale (onboarding, filtro "Senza abbonamento" di R4), non un errore che il client deve distinguere da un 404 vero; la forma annidata tiene separato ciò che è salvato da ciò che è calcolato; un'anteprima in GET si mette in cache con `useQuery` per chiave `(paidOn, periods)` e non ha effetti. B rende il dry run identico al POST ma fa passare per POST una lettura. C risparmia una chiamata ma lega l'anteprima a ogni lettura dell'abbonamento.

### D2 — Nomi delle colonne nuove (0015)

| Opzione | Pagamento | Pausa | Contatore |
| --- | --- | --- | --- |
| **A (raccomandata)** | `previous_paid_through`, `previous_billing_day` | `previous_paid_through`, `previous_billing_day` | `revision` su tutte e tre |
| B | `previous_paid_through`, `previous_billing_day` | `shift_days`, `previous_billing_day` (lo spostamento, come nel requisito) | `revision` |
| C | `paid_through_before`, `billing_day_before` | `paid_through_before`, `billing_day_before` | `change_number` |

Perché A: stessa coppia nei due posti, una sola logica di ripristino; il prefisso `previous_` si legge come "prima di questa operazione". B richiede di ricalcolare la data dallo spostamento e conserva un concetto in più. In Drizzle diventano `previousPaidThrough`, `previousBillingDay`, `revision`.

### D3 — Dove vivono route, validazione e accesso DB

| Opzione | Route | Validazione (pura, con test) | Accesso DB |
| --- | --- | --- | --- |
| **A (raccomandata)** | nuovo `be/src/routes/coachsubscriptions.ts` con `coachSubscriptionsRouter`, montato in `coach.ts` con `coachRouter.use(coachSubscriptionsRouter)` dopo `requireAuth`/`requireRole` | `be/src/services/subscriptionValidation.ts` (offerta, PUT, pagamento, anteprima, pausa) | `be/src/services/subscriptionAccess.ts` |
| B | tutto in `coach.ts` (oggi 610 righe, ne aggiungerebbe circa 300) | `subscriptionValidation.ts` | `subscriptionAccess.ts` |
| C | due file: `be/src/routes/offers.ts` e `be/src/routes/subscriptions.ts`, montati in `routes/index.ts` su `/coach` con il proprio `requireAuth` + `requireRole` | `offerValidation.ts` + `subscriptionValidation.ts` | `coachOffers.ts` + `subscriptionAccess.ts` |

Perché A: `coach.ts` resta leggibile; montarlo dentro `coachRouter` eredita l'autenticazione senza duplicarla (con C ogni richiesta `/coach/*` passerebbe due volte da `requireAuth`); i suffissi `*Validation.ts` e `*Access.ts` esistono già (`sessionValidation.ts`, `sessionAccess.ts`, `coachAthleteAccess.ts`) e `subscription.ts` resta solo logica pura come dice il piano. Per la funzione di anteprima: **`paymentPreview`** (raccomandato), `previewPayment` o `paymentStartOptions`.

### Limite accettato: pagamento dopo una pausa che non ha spostato nulla

Decisione 2026-10-23 (review R2, punto 2). Se il cliente era già scaduto all'inizio della pausa, la pausa non sposta `paidThrough` (`k = 0`). Un pagamento registrato dopo calcola la copertura senza tenere conto della pausa: i giorni pagati che cadono dentro la pausa si perdono (esempio: scadenza 25/10, pausa 01/11–30/11, pagamento il 26/10 → copertura 25/10–25/11, novembre è tutto in pausa). Il backend resta così; in **R3** il dialog Registra pagamento avvisa il coach quando la copertura proposta attraversa una pausa attiva. Il rimedio manuale: annullare il pagamento, togliere la pausa, registrare il pagamento, rimettere la pausa.

### Note da confermare (non bloccanti)

1. **Pausa tutta nel passato**: ammessa (requisito "fino a 31 g nel passato"), ma non si può più togliere (`Pause has already ended`). Alternativa: chiedere `endsOn >= oggi` alla creazione. Raccomando di ammetterla: è il caso "mi sono dimenticato di segnare l'infortunio".
2. **Togliere una pausa in corso dopo un pagamento** dà 409 come da requisito: il cliente che paga durante la pausa e rientra prima non può chiuderla. È il prezzo della regola "si annulla solo l'ultima operazione".
3. **Limite di 100 caratteri sul nome dell'offerta**: non era nei requisiti, aggiunto per tenere sotto controllo l'input.
