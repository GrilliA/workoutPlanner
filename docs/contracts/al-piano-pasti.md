# Contratto AL — Piano pasti (coach AL2, atleta AL4)

Stato: **proposta per il Contract Gate di AL2**, da approvare. La parte coach è implementata in AL2; la parte atleta è scritta qui perché il contratto sia uno solo, ed è marcata **AL4, non implementata**.
Piano: `claude/AL-alimentazione.md` (sezioni 4, 5, AL2, AL4). Schema AL1: `be/src/db/schema/{mealplans,mealplanmeals,mealplanitems,meallogs}.ts`. Logica pura: `be/src/services/mealPlan.ts`. Validazione: `be/src/services/mealPlanValidation.ts`. Accesso al DB: `be/src/services/mealPlanAccess.ts`. Route coach: `be/src/routes/coachmealplan.ts`.

Lessico: nelle copy sempre "Alimentazione" o "Pasti", mai "Dieta". Gli identificatori dell'API sono in inglese (`meal-plan`, `meal-logs`).

## Regole comuni

- Le route coach stanno sotto `/api/coach`, dietro `requireAuth` + `requireRole("coach")` (401 / 403 come oggi). Le route atleta (AL4) sotto `/api/athlete`, dietro `requireRole("athlete")`.
- `:athleteId` non intero o `< 1` → 400 `"Invalid athlete id"`.
- Atleta non collegato al coach (`coach_athletes`) → 404 `"Client not found"`, per letture e scritture. Non c'è l'eccezione degli ex clienti del registro: allo scollegamento piano, pasti, voci e registrazioni sono cancellati a cascata (H8), quindi non resta nulla da leggere.
- Un atleta ha al massimo un coach (`unique(athlete_id)` su `coach_athletes`): un coach che chiede il cliente di un altro coach riceve 404 `"Client not found"`, senza sapere se l'atleta esiste.
- Body che non è un oggetto JSON (assente, `null`, array, primitivo) → 400 `"Invalid request body"`. I campi sconosciuti vengono ignorati. Il JSON malformato è tradotto in 400 `"Invalid request body"` dall'error handler globale, come nelle altre route.
- Errori: sempre `{ "error": string }` in inglese, con testo fisso (senza indici di array), così il pannello li traduce con una tabella; la copy italiana sta nel client.
- **Ordine dei controlli**: (body troppo grande 413, vedi sotto) → id 400 → `Client not found` 404 → body / query 400 → risorsa 404 (`Meal plan not found`, `Meal not found`, `Meal item not found`).
- **Body troppo grande → 413 `"Request body too large"`**. Il limite è quello predefinito del parser JSON globale (`express.json()` in `be/src/app.ts`): 100 kB, cioè 102 400 byte di body UTF-8. Il parser gira prima di autenticazione e route, quindi il 413 arriva prima di ogni altro controllo (anche prima di 401 / 400 / 404); il testo viene da `CLIENT_ERROR_MESSAGES` in `be/src/middleware/errorResponse.ts`, sempre come `{ "error": string }`. Nulla viene salvato. Capita solo con il PUT del piano vicino ai tetti e con testo non ASCII: un piano con tutti i tetti pieni pesa circa 82 kB in ASCII e circa 155 kB con lettere accentate o emoji (ogni unità UTF-16 di questi caratteri costa 2 byte in UTF-8), quindi i tetti della tabella **Limiti** da soli non garantiscono di stare sotto il limite. Il pannello: non ritenta lo stesso body, tiene le modifiche locali e mostra un messaggio del tipo "Il piano è troppo lungo: accorcia note o voci e salva di nuovo". Il limite globale non cambia in AL2 (vale per tutte le route sotto `/api`, tranne `/api/waitlist` che ha un proprio parser da 2 kB).
- Mai 500 per input: ogni valore che arriva al DB è già validato (id, lunghezze, formato dell'ora, date). Il testo con il carattere U+0000 è rifiutato (Postgres lo rifiuta con un 500): `"<campo> must not contain a NUL character"`.
- **Testi**: si tolgono gli spazi iniziali e finali; un testo facoltativo vuoto dopo il taglio diventa `null`. Le lunghezze si contano dopo il taglio, in **unità UTF-16** (`String.length` di JavaScript, come nel pannello): una lettera accentata vale 1, la maggior parte delle emoji vale 2. Un contatore del pannello che conta i caratteri visibili (grafemi) sottostima la lunghezza.
- **Date**: stringhe `YYYY-MM-DD` di calendario valide tra `2000-01-01` e `2099-12-31`; "oggi" è `todayInRome()`.
- **Additivo**: nessuna route esistente cambia forma in AL2. `GET /athlete/home` cambia (in modo additivo) solo in AL4.

## Endpoint

| Metodo | Path | Successo | Fase |
| --- | --- | --- | --- |
| GET | `/coach/clients/:athleteId/meal-plan` | 200 `{ mealPlan: MealPlan \| null }` | AL2 |
| PUT | `/coach/clients/:athleteId/meal-plan` | 201 (creato) / 200 (aggiornato) `MealPlan` | AL2 |
| PATCH | `/coach/clients/:athleteId/meal-plan` | 200 `MealPlan` | AL2 |
| GET | `/coach/clients/:athleteId/meal-logs?from=&to=` | 200 `{ days: MealDayAdherence[] }` | AL2 |
| GET | `/athlete/home` (campo `nutrition`) | 200 | AL4, non implementata |
| GET | `/athlete/meal-plan/today` | 200 | AL4, non implementata |
| PUT | `/athlete/meal-logs` | 200 `MealLog` | AL4, non implementata |
| DELETE | `/athlete/meal-logs?mealId=&date=` | 204 | AL4, non implementata |
| GET | `/athlete/meal-logs?from=&to=` | 200 `{ logs: MealLog[] }` | AL4, non implementata |

Niente `DELETE` del piano in v1: il coach lo disattiva con `PATCH { isActive: false }`.

## Tipi di risposta

```ts
type MealItem = {
  id: number;
  food: string;              // 1..120 caratteri
  quantity: string | null;   // testo libero ("80 g", "una tazza"), 1..60 caratteri; niente calorie né macro (H3)
  position: number;          // 0, 1, 2… nell'ordine del pasto
};

type Meal = {
  id: number;
  name: string;              // 1..60 caratteri
  timeOfDay: string | null;  // "HH:MM" (00:00..23:59), ora di Roma, solo da mostrare
  notes: string | null;      // 1..500 caratteri
  position: number;          // 0, 1, 2… nell'ordine della giornata
  items: MealItem[];         // in ordine di position
};

type MealPlan = {
  id: number;
  athleteId: number;
  isActive: boolean;
  notes: string | null;      // 1..1000 caratteri
  meals: Meal[];             // in ordine di position
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp: cambia a ogni PUT e PATCH riuscito
};

type MealLogStatus = "done" | "other"; // i client leggono lo status con una via di fuga per valori futuri

type MealLog = {
  mealId: number | null;     // null se il pasto è stato tolto dal piano dopo la registrazione
  mealName: string;          // copia del nome al momento della registrazione
  date: string;              // YYYY-MM-DD, giorno di Roma
  status: MealLogStatus;
  note: string | null;       // 1..280 caratteri
  updatedAt: string;         // ISO timestamp
};

type MealDayAdherence = {
  date: string;              // YYYY-MM-DD
  mealCount: number;         // pasti del piano adesso
  doneCount: number;         // pasti del piano segnati "fatto" quel giorno
  otherCount: number;        // pasti del piano segnati "ho mangiato altro" quel giorno
  removedCount: number;      // registrazioni di quel giorno per pasti non più nel piano
};
```

Le colonne interne (`coach_id`, `meal_plan_id`, `created_at` dei pasti e dei log) non escono nelle risposte.

`doneCount + otherCount` non supera mai `mealCount`: i conteggi scorrono i pasti del piano attuale, e il DB tiene una sola registrazione per (atleta, giorno, pasto). Una registrazione di un pasto tolto (con `meal_id` NULL) va in `removedCount` invece di gonfiare il giorno. `mealCount` è quello del piano di oggi anche per i giorni passati: lo storico dei pasti di allora non è conservato.

## Limiti

Tetti di sicurezza, non regole di prodotto (confermati dall'utente). Costanti in `mealPlanValidation.ts`; quella della nota di una registrazione (`MAX_MEAL_LOG_NOTE_LENGTH`) è già lì ma viene usata solo da AL4. Le lunghezze sono in unità UTF-16 (vedi **Testi**).

| Limite | Valore | Errore 400 |
| --- | --- | --- |
| pasti per piano | 12 | `"meals must have at most 12 entries"` |
| voci per pasto | 30 | `"meals.items must have at most 30 entries"` |
| nome del pasto | 60 | `"meals.name must be at most 60 characters"` |
| alimento | 120 | `"meals.items.food must be at most 120 characters"` |
| quantità | 60 | `"meals.items.quantity must be at most 60 characters"` |
| note del piano | 1000 | `"notes must be at most 1000 characters"` |
| note del pasto | 500 | `"meals.notes must be at most 500 characters"` |
| intervallo di `meal-logs` | 31 giorni (estremi inclusi) | `"Range must be at most 31 days"` |
| nota di una registrazione (AL4) | 280 | `"note must be at most 280 characters"` |

## Coach (AL2)

### GET `/coach/clients/:athleteId/meal-plan`

200 `{ mealPlan: MealPlan }`, oppure `{ mealPlan: null }` se il coach non ha ancora creato un piano per il cliente. Il piano disattivato si legge come quello attivo (`isActive: false`).

Errori: 400 `"Invalid athlete id"`, 404 `"Client not found"`.

### PUT `/coach/clients/:athleteId/meal-plan`

Sostituisce l'intero piano: il body è il piano come deve essere dopo il salvataggio.

```ts
type MealPlanInput = {
  notes?: string | null;                 // assente o null → null
  meals: {                               // 0..12; l'ordine dell'array è il nuovo position
    id?: number;                         // presente = aggiorna quel pasto, assente = nuovo pasto
    name: string;
    timeOfDay?: string | null;           // "HH:MM" o null; assente → null
    notes?: string | null;               // assente → null
    items: {                             // 0..30; l'ordine dell'array è il nuovo position
      id?: number;                       // presente = aggiorna quella voce, assente = nuova voce
      food: string;
      quantity?: string | null;          // assente → null
    }[];
  }[];
};
```

Regole:
- **Primo PUT** (nessun piano per la coppia): crea il piano **attivo** → 201 `MealPlan`. In questo caso nessun `id` è ammesso (non esiste un pasto da aggiornare): un `id` → 404 `"Meal not found"`.
- **PUT successivi**: aggiornano → 200 `MealPlan`. `isActive` non cambia (si cambia solo con PATCH).
- Un `id` di pasto presente aggiorna quel pasto (nome, ora, note, posizione); deve essere un pasto **di questo piano**, altrimenti 404 `"Meal not found"`. Rinominare un pasto tenendo il suo `id` mantiene le registrazioni dell'atleta su quel pasto (restano collegate per `mealId`; il loro `mealName` resta il nome copiato al momento della registrazione). Per "ricominciare da zero" un pasto il pannello lo invia senza `id`.
- Un `id` di voce presente aggiorna quella voce; deve essere una voce **del pasto con cui viene inviata** (stesso piano, stesso pasto), altrimenti 404 `"Meal item not found"`. Una voce non si sposta da un pasto all'altro tenendo l'id: si toglie da uno e si crea nell'altro. Dentro un pasto nuovo (senza `id`) le voci non possono avere `id`.
- Un pasto o una voce esistente il cui `id` non viene inviato è **rimosso**. Le registrazioni dell'atleta per un pasto rimosso restano, con `mealId: null` e il `mealName` copiato al momento della registrazione (FK `on delete set null`).
- Lo stesso `id` ripetuto nel body → 400 `"Duplicate meal id"` / `"Duplicate meal item id"`.
- Nessuna riga di un altro piano viene mai letta o scritta: gli `id` sono controllati sulle righe del piano della coppia, letto dentro la transazione, e ogni `UPDATE` / `DELETE` filtra anche per piano (o pasto).
- Tutta la scrittura avviene in una transazione: il collegamento `coach_athletes` della coppia si legge `FOR SHARE` (manca → 404 `"Client not found"`), poi il piano `FOR UPDATE`. Primi PUT concorrenti: uno solo crea il piano (201); un PUT che inserisce mentre il primo è ancora in corso trova la unique `(coach_id, athlete_id)` → 409 `"Meal plan already exists"`, uno che arriva dopo il commit del primo lo aggiorna (200). Un PUT in corsa con lo scollegamento del cliente risponde come se fosse arrivato prima (201 / 200, poi la cascata cancella il piano) o dopo (404 `"Client not found"`): in nessun caso resta un piano per un ex cliente.

Errori di validazione (400), in quest'ordine di campo:
- `"Invalid request body"` (body non oggetto).
- note del piano: `"notes must be a string or null"`, `"notes must not contain a NUL character"`, `"notes must be at most 1000 characters"`.
- `"meals must be an array"`, `"meals must have at most 12 entries"`.
- per ogni pasto: `"Invalid request body"` (pasto non oggetto), `"Invalid meal id"` (non intero o `< 1`), `"meals.name is required"`, `"meals.name must be at most 60 characters"`, `"meals.timeOfDay must be HH:MM or null"`, `"meals.notes must be a string or null"`, `"meals.notes must be at most 500 characters"`, `"meals.items must be an array"`, `"meals.items must have at most 30 entries"`.
- per ogni voce: `"Invalid request body"`, `"Invalid meal item id"`, `"meals.items.food is required"`, `"meals.items.food must be at most 120 characters"`, `"meals.items.quantity must be a string or null"`, `"meals.items.quantity must be at most 60 characters"`.
- i campi di testo con U+0000: `"<campo> must not contain a NUL character"` con lo stesso nome di campo (`meals.name`, `meals.items.food`, …).
- `"Duplicate meal id"`, `"Duplicate meal item id"`.

Poi: 404 `"Meal not found"`, 404 `"Meal item not found"`, 409 `"Meal plan already exists"`. Prima di tutti, 413 `"Request body too large"` (vedi **Regole comuni**).

**Dopo un 404 o un 409 sul PUT il pannello ricarica il piano** (`GET`) prima di permettere un nuovo salvataggio. Il caso tipico sono due schede aperte dello stesso coach: la scheda A toglie un pasto, la scheda B salva ancora il suo `id` e riceve 404 `"Meal not found"` / `"Meal item not found"`; oppure entrambe fanno il primo PUT e una riceve 409. Ritentare lo stesso body darebbe lo stesso errore. Vale anche per 404 `"Client not found"` (cliente scollegato nel frattempo): lì il pannello torna alla lista clienti.

### PATCH `/coach/clients/:athleteId/meal-plan`

Body `{ isActive: boolean }` → 200 `MealPlan`. Idempotente: disattivare un piano già disattivato risponde 200 con lo stesso piano (cambia solo `updatedAt`). Disattivare non cancella pasti né registrazioni; riattivare rimette il piano com'era.

Errori: 400 `"Invalid athlete id"`, 404 `"Client not found"`, 400 `"Invalid request body"`, 400 `"isActive must be a boolean"`, 404 `"Meal plan not found"`.

### GET `/coach/clients/:athleteId/meal-logs?from=YYYY-MM-DD&to=YYYY-MM-DD`

200 `{ days: MealDayAdherence[] }`: una riga per giorno da `from` a `to` (inclusi), in ordine di data, anche per i giorni senza registrazioni. Usa i pasti del piano attuale, attivo o no. Senza piano: una riga per giorno con tutti i conteggi a 0. Per gli ultimi 7 giorni del pannello: `from = oggi - 6`, `to = oggi`.

Errori: 400 `"Invalid athlete id"`, 404 `"Client not found"`, 400 `"from must be YYYY-MM-DD"`, 400 `"to must be YYYY-MM-DD"`, 400 `"to must be on or after from"`, 400 `"Range must be at most 31 days"`.

## Atleta (AL4, non implementata)

Questa parte è la proposta del piano (sezione 5) e verrà rivista al Contract Gate di AL4. Nessuna di queste route esiste dopo AL2.

- `GET /athlete/home`, campo additivo `nutrition: { mealPlanId: number; updatedAt: string } | null`: `null` se l'atleta non ha coach o il piano non c'è o è disattivato (H1: modulo attivo = piano attivo). Con `null` l'app nasconde lo switch Allenamento / Alimentazione. Convive con `coaching` (R6) senza toccarlo.
- `GET /athlete/meal-plan/today` → `{ date: string; mealPlan: (MealPlan & { meals: (Meal & { log: MealLog | null })[] }) | null; nextMealId: number | null }`. `date` è oggi di Roma; `nextMealId` è il primo pasto in ordine senza registrazione per `date` (`nextMealId` in `mealPlan.ts`); `mealPlan: null` senza piano attivo.
- `PUT /athlete/meal-logs` body `{ mealId: number; date: string; status: MealLogStatus; note?: string | null }` → 200 `MealLog`. Idempotente: la unique `(athlete_id, date, meal_id)` tiene una riga sola, due PUT uguali danno lo stesso risultato. `date` deve essere oggi o ieri di Roma (H7, `isLoggableDate`). `mealName` è copiato dal pasto al momento della scrittura.
- `DELETE /athlete/meal-logs?mealId=&date=` → 204, anche se la registrazione non c'era (idempotente). Stessa regola su `date`.
- `GET /athlete/meal-logs?from=&to=` → `{ logs: MealLog[] }`, al massimo 31 giorni, per Progressi.

Errori proposti: 400 `"Invalid request body"`, 400 `"Invalid meal id"`, 400 `"date must be today or yesterday"`, 400 `"status must be done or other"`, 400 `"note must be at most 280 characters"`, 404 `"Meal plan not found"` (nessun piano attivo), 404 `"Meal not found"` (pasto non del piano attivo dell'atleta), più i 400 sull'intervallo come per il coach.

## Decisioni aperte

1. `removedCount` in `MealDayAdherence` (aggiunto dopo la review di AL1): il pannello può mostrarlo come "pasti non più nel piano" o ignorarlo.
2. Senza piano, `meal-logs` risponde con i giorni a zero (default) invece di `{ days: [] }`.
3. Un piano con 0 pasti è ammesso (il coach può salvare prima le note e poi i pasti).
