# Contratto AL — Piano pasti (coach AL2, atleta AL4)

Stato: **proposta per il Contract Gate di AL2**, da approvare. La parte coach è implementata in AL2; la parte atleta è scritta qui perché il contratto sia uno solo, ed è marcata **AL4, non implementata**.
Piano: `docs/plans/AL-alimentazione.md` (sezioni 4, 5, AL2, AL4). Schema AL1: `be/src/db/schema/{mealtags,mealplans,mealplanmeals,mealplanitems,meallogs,mealplantemplates,mealplantemplatemeals}.ts`. Logica pura: `be/src/services/mealPlan.ts`. Validazione: `be/src/services/mealPlanValidation.ts`. Accesso al DB: `be/src/services/mealPlanAccess.ts` (piano), `mealTagAccess.ts` (tag), `mealPlanTemplateAccess.ts` (template). Route coach: `be/src/routes/coachmealplan.ts`.
Aggiornato il 2026-11-22 con le decisioni dell'utente: tag dei pasti, template di giornata, piano con almeno un pasto (sezione **Decisioni**).

Lessico: nelle copy sempre "Alimentazione" o "Pasti", mai "Dieta". Gli identificatori dell'API sono in inglese (`meal-plan`, `meal-logs`).

## Regole comuni

- Le route coach stanno sotto `/api/coach`, dietro `requireAuth` + `requireRole("coach")` (401 / 403 come oggi). Le route atleta (AL4) sotto `/api/athlete`, dietro `requireRole("athlete")`.
- `:athleteId` non intero o `< 1` → 400 `"Invalid athlete id"`. Le route dei tag e dei template non riguardano un cliente: niente `:athleteId` né `Client not found`, ogni coach vede e scrive solo i propri.
- Atleta non collegato al coach (`coach_athletes`) → 404 `"Client not found"`, per letture e scritture. Non c'è l'eccezione degli ex clienti del registro: allo scollegamento piano, pasti, voci e registrazioni sono cancellati a cascata (H8), quindi non resta nulla da leggere.
- Un atleta ha al massimo un coach (`unique(athlete_id)` su `coach_athletes`): un coach che chiede il cliente di un altro coach riceve 404 `"Client not found"`, senza sapere se l'atleta esiste.
- Body che non è un oggetto JSON (assente, `null`, array, primitivo) → 400 `"Invalid request body"`. I campi sconosciuti vengono ignorati. Il JSON malformato è tradotto in 400 `"Invalid request body"` dall'error handler globale, come nelle altre route.
- Errori: sempre `{ "error": string }` in inglese, con testo fisso (senza indici di array), così il pannello li traduce con una tabella; la copy italiana sta nel client.
- **Ordine dei controlli**: (body troppo grande 413, vedi sotto) → id 400 → `Client not found` 404 → body / query 400 → risorsa 404 (`Meal plan not found`, `Meal not found`, `Meal item not found`, poi `Meal tag not found`; `Meal plan template not found`) → conflitto 409.
- **Body troppo grande → 413 `"Request body too large"`**. Il limite è quello predefinito del parser JSON globale (`express.json()` in `be/src/app.ts`): 100 kB, cioè 102 400 byte di body UTF-8. Il parser gira prima di autenticazione e route, quindi il 413 arriva prima di ogni altro controllo (anche prima di 401 / 400 / 404); il testo viene da `CLIENT_ERROR_MESSAGES` in `be/src/middleware/errorResponse.ts`, sempre come `{ "error": string }`. Nulla viene salvato. Capita solo con il PUT del piano vicino ai tetti e con testo non ASCII: un piano con tutti i tetti pieni pesa circa 82 kB in ASCII e circa 155 kB con lettere accentate o emoji (ogni unità UTF-16 di questi caratteri costa 2 byte in UTF-8), quindi i tetti della tabella **Limiti** da soli non garantiscono di stare sotto il limite. Il pannello: non ritenta lo stesso body, tiene le modifiche locali e mostra un messaggio del tipo "Il piano è troppo lungo: accorcia note o voci e salva di nuovo". Il limite globale non cambia in AL2 (vale per tutte le route sotto `/api`, tranne `/api/waitlist` che ha un proprio parser da 2 kB).
- Mai 500 per input: ogni valore che arriva al DB è già validato (id, lunghezze, formato dell'ora, date). Il testo con il carattere U+0000 è rifiutato (Postgres lo rifiuta con un 500): `"<campo> must not contain a NUL character"`.
- **Testi**: si tolgono gli spazi iniziali e finali; un testo facoltativo vuoto dopo il taglio diventa `null`. Le lunghezze si contano dopo il taglio, in **unità UTF-16** (`String.length` di JavaScript, come nel pannello): una lettera accentata vale 1, la maggior parte delle emoji vale 2. Un contatore del pannello che conta i caratteri visibili (grafemi) sottostima la lunghezza.
- **Date**: stringhe `YYYY-MM-DD` di calendario valide tra `2000-01-01` e `2099-12-31`; "oggi" è `todayInRome()`.
- **Additivo**: nessuna route esistente cambia forma in AL2. `GET /athlete/home` cambia (in modo additivo) solo in AL4.

## Endpoint

| Metodo | Path | Successo | Fase |
| --- | --- | --- | --- |
| GET | `/coach/meal-tags` | 200 `{ mealTags: MealTag[] }` | AL2 |
| POST | `/coach/meal-tags` | 201 `MealTag` | AL2 |
| PATCH | `/coach/meal-tags/:id` | 200 `MealTag` | AL2 |
| GET | `/coach/meal-plan-templates` | 200 `{ mealPlanTemplates: MealPlanTemplate[] }` | AL2 |
| POST | `/coach/meal-plan-templates` | 201 `MealPlanTemplate` | AL2 |
| PUT | `/coach/meal-plan-templates/:id` | 200 `MealPlanTemplate` | AL2 |
| DELETE | `/coach/meal-plan-templates/:id` | 204 | AL2 |
| GET | `/coach/clients/:athleteId/meal-plan` | 200 `{ mealPlan: MealPlan \| null }` | AL2 |
| PUT | `/coach/clients/:athleteId/meal-plan` | 201 (creato) / 200 (aggiornato) `MealPlan` | AL2 |
| PATCH | `/coach/clients/:athleteId/meal-plan` | 200 `MealPlan` | AL2 |
| GET | `/coach/clients/:athleteId/meal-logs?from=&to=` | 200 `{ days: MealDayAdherence[] }` | AL2 |
| GET | `/athlete/home` (campo `nutrition`) | 200 | AL4, non implementata |
| GET | `/athlete/meal-plan/today` | 200 | AL4, non implementata |
| PUT | `/athlete/meal-logs` | 200 `MealLog` | AL4, non implementata |
| DELETE | `/athlete/meal-logs?mealId=&date=` | 204 | AL4, non implementata |
| GET | `/athlete/meal-logs?from=&to=` | 200 `{ logs: MealLog[] }` | AL4, non implementata |

Niente `DELETE` del piano in v1: il coach lo disattiva con `PATCH { isActive: false }`. Niente `DELETE` dei tag: un tag si archivia (sezione **Tag dei pasti**). Niente endpoint "applica template": il pannello legge il template e salva il piano con il normale PUT.

## Tipi di risposta

```ts
type MealItem = {
  id: number;
  food: string;              // 1..120 caratteri
  quantity: string | null;   // testo libero ("80 g", "una tazza"), 1..60 caratteri; niente calorie né macro (H3)
  position: number;          // 0, 1, 2… nell'ordine del pasto
};

type MealTag = {
  id: number;
  name: string;              // 1..60 caratteri, unico tra i tag non archiviati del coach (maiuscole e minuscole uguali)
  position: number;          // ordine nella lista del coach; può avere buchi dopo un'archiviazione, conta solo l'ordine
  archivedAt: string | null; // ISO timestamp; sempre null nella lista, valorizzato nella risposta dell'archiviazione
};

type Meal = {
  id: number;
  tagId: number;             // il tag del pasto (anche archiviato, se il piano lo aveva già)
  name: string;              // nome del tag, letto adesso: rinominare il tag cambia il nome qui
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

type MealPlanTemplateMeal = {
  tagId: number;
  name: string;              // nome del tag, letto adesso
  timeOfDay: string | null;  // "HH:MM" (00:00..23:59)
};

type MealPlanTemplate = {
  id: number;
  name: string;              // 1..60 caratteri ("Giornata standard"); non serve che sia unico
  meals: MealPlanTemplateMeal[]; // 1..12, in ordine; niente alimenti né note
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp: cambia a ogni PUT riuscito
};

type MealLogStatus = "done" | "other"; // i client leggono lo status con una via di fuga per valori futuri

type MealLog = {
  mealId: number | null;     // null se il pasto è stato tolto dal piano dopo la registrazione
  mealName: string;          // copia del nome del tag al momento della registrazione: rinominare il tag non lo cambia
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

Le colonne interne (`coach_id`, `meal_plan_id`, `template_id`, `created_at` dei pasti e dei log, gli id dei pasti dei template) non escono nelle risposte.

`doneCount + otherCount` non supera mai `mealCount`: i conteggi scorrono i pasti del piano attuale, e il DB tiene una sola registrazione per (atleta, giorno, pasto). Una registrazione di un pasto tolto (con `meal_id` NULL) va in `removedCount` invece di gonfiare il giorno. `mealCount` è quello del piano di oggi anche per i giorni passati: lo storico dei pasti di allora non è conservato.

## Limiti

Tetti di sicurezza, non regole di prodotto (confermati dall'utente; quelli di tag e template proposti il 2026-11-22, da confermare). Il minimo di 1 pasto invece è una regola di prodotto (decisione 2026-11-22). I due tetti per coach dipendono da quello che il coach ha già salvato, quindi rispondono 409 e non 400. Costanti in `mealPlanValidation.ts`, tranne il 280 della nota di una registrazione, valore previsto per AL4: arriverà con la sua validazione e oggi non è nel codice. Le lunghezze sono in unità UTF-16 (vedi **Testi**).

| Limite | Valore | Errore 400 |
| --- | --- | --- |
| pasti per piano | da 1 a 12 | `"meals must have at least 1 entry"`, `"meals must have at most 12 entries"` |
| voci per pasto | 30 | `"meals.items must have at most 30 entries"` |
| nome del tag | 60 | `"name must be at most 60 characters"` |
| tag per coach (non archiviati) | 30 | 409 `"Too many meal tags"` |
| template per coach | 20 | 409 `"Too many meal plan templates"` |
| nome del template | 60 | `"name must be at most 60 characters"` |
| pasti per template | da 1 a 12 | `"meals must have at least 1 entry"`, `"meals must have at most 12 entries"` |
| alimento | 120 | `"meals.items.food must be at most 120 characters"` |
| quantità | 60 | `"meals.items.quantity must be at most 60 characters"` |
| note del piano | 1000 | `"notes must be at most 1000 characters"` |
| note del pasto | 500 | `"meals.notes must be at most 500 characters"` |
| intervallo di `meal-logs` | 31 giorni (estremi inclusi) | `"Range must be at most 31 days"` |
| nota di una registrazione (AL4) | 280 | `"note must be at most 280 characters"` |

## Coach (AL2)

### Tag dei pasti

Ogni coach ha una lista di tag (Colazione, Pranzo, …). Un pasto del piano o di un template ha **solo** un tag, niente nome libero: il nome mostrato è quello del tag. Rinominare un tag cambia il nome in tutti i piani e i template del coach; le registrazioni dell'atleta tengono il `mealName` copiato al momento della registrazione.

**Tag iniziali.** Un coach che non ha mai avuto tag riceve, alla prima `GET /coach/meal-tags` (o al primo `POST`), Colazione, Spuntino, Pranzo, Merenda, Cena, in quest'ordine. La creazione è idempotente: due letture insieme creano i cinque tag una volta sola (lo garantisce l'indice unico sul nome). I tag archiviati contano: un coach che li ha archiviati tutti non li riceve di nuovo. Registrazione e auth non cambiano.

**Archiviazione.** Un tag non si cancella: si archivia (`archived: true`). Sparisce dalla lista e non si può più modificare (PATCH → 404), ma i piani e i template che lo usano restano validi e continuano a mostrarlo. Un salvataggio (PUT del piano o del template) può tenere un tag archiviato al massimo tante volte quante lo usa la versione salvata: i pasti che lo hanno già restano, nessun pasto nuovo lo prende (404 `"Meal tag not found"`, la stessa risposta del tag inesistente: nella lista che il pannello offre non c'è). Il pannello riconosce un tag archiviato perché il `tagId` di un pasto non è nella lista. Un tag archiviato non torna attivo in v1; il suo nome torna libero per un tag nuovo. La cancellazione vera di un tag mai usato non è offerta (decisione 2026-11-22: solo archiviazione, più semplice). Nel DB un tag usato non si può cancellare (FK), e cancellare il coach cancella tag, piani e template.

#### GET `/coach/meal-tags`

200 `{ mealTags: MealTag[] }`: i tag non archiviati del coach, in ordine di `position` (a parità, di `id`). Crea i tag iniziali se il coach non ne ha mai avuti.

#### POST `/coach/meal-tags`

Body `{ name: string }` → 201 `MealTag`, in fondo alla lista.

Errori: 400 `"Invalid request body"`, `"name is required"`, `"name must not contain a NUL character"`, `"name must be at most 60 characters"`; 409 `"Meal tag already exists"` (stesso nome di un tag non archiviato del coach, senza distinzione di maiuscole: "pranzo" = "Pranzo"); 409 `"Too many meal tags"` (già 30 tag non archiviati).

#### PATCH `/coach/meal-tags/:id`

Body con almeno uno di:

```ts
type MealTagPatch = {
  name?: string;      // rinomina: vale per tutti i piani e i template del coach
  position?: number;  // 0..29: nuovo indice del tag nella lista dei tag non archiviati; oltre la fine = in fondo
  archived?: true;    // archivia; false non è ammesso (un tag archiviato non torna)
};
```

→ 200 `MealTag`. Il riordino sposta un tag alla volta (il pannello manda un PATCH per lo spostamento fatto) e riscrive le posizioni dei tag non archiviati come 0, 1, 2…; con `archived: true` una `position` inviata non ha effetto. Le scritture sui tag di un coach sono serializzate (lock sulle righe dei suoi tag), quindi due riordini o due aggiunte insieme non mescolano l'ordine.

Errori: 400 `"Invalid meal tag id"` (`:id` non intero o `< 1`); 400 `"Invalid request body"`, `"At least one field is required"`, gli errori di `name` come nel POST, `"position must be an integer from 0 to 29"`, `"archived must be true"`; 404 `"Meal tag not found"` (non esiste, è di un altro coach o è archiviato: stessa risposta); 409 `"Meal tag already exists"`.

### Template di giornata

Un template ha un nome e la sequenza ordinata dei pasti: solo tag e orario facoltativo, niente alimenti né note. Il pannello lo **applica** da solo: legge il template, riempie l'editor del piano con un pasto per ogni pasto del template (tag + orario, senza voci) e salva con il normale `PUT /coach/clients/:athleteId/meal-plan`. Il piano non ricorda da quale template è nato; modificare o cancellare il template non tocca i piani.

#### GET `/coach/meal-plan-templates`

200 `{ mealPlanTemplates: MealPlanTemplate[] }`, in ordine di nome (a parità, di `id`). Solo i template del coach.

#### POST `/coach/meal-plan-templates` e PUT `/coach/meal-plan-templates/:id`

```ts
type MealPlanTemplateInput = {
  name: string;               // 1..60 caratteri
  meals: {                    // 1..12; l'ordine dell'array è l'ordine dei pasti
    tagId: number;            // un tag del coach
    timeOfDay?: string | null; // "HH:MM" o null; assente → null
  }[];
};
```

POST → 201 `MealPlanTemplate`. PUT sostituisce nome e pasti → 200 `MealPlanTemplate` (i pasti del template non hanno id: nessuna riga punta a loro). I campi sconosciuti (per esempio `items`) sono ignorati.

Errori: 400 `"Invalid meal plan template id"` (solo PUT e DELETE); 400 `"Invalid request body"`, `"name is required"`, `"name must not contain a NUL character"`, `"name must be at most 60 characters"`, `"meals must be an array"`, `"meals must have at least 1 entry"`, `"meals must have at most 12 entries"`, per ogni pasto `"Invalid request body"`, `"meals.tagId is required"`, `"Invalid meal tag id"`, `"meals.timeOfDay must be HH:MM or null"`; 404 `"Meal plan template not found"` (PUT: non esiste o è di un altro coach); 404 `"Meal tag not found"` (tag inesistente, di un altro coach, o archiviato e non già nel template come descritto in **Archiviazione**); 409 `"Too many meal plan templates"` (POST, già 20 template).

#### DELETE `/coach/meal-plan-templates/:id`

204. Errori: 400 `"Invalid meal plan template id"`, 404 `"Meal plan template not found"`.

### GET `/coach/clients/:athleteId/meal-plan`

200 `{ mealPlan: MealPlan }`, oppure `{ mealPlan: null }` se il coach non ha ancora creato un piano per il cliente. Il piano disattivato si legge come quello attivo (`isActive: false`).

Errori: 400 `"Invalid athlete id"`, 404 `"Client not found"`.

### PUT `/coach/clients/:athleteId/meal-plan`

Sostituisce l'intero piano: il body è il piano come deve essere dopo il salvataggio.

```ts
type MealPlanInput = {
  notes?: string | null;                 // assente o null → null
  meals: {                               // 1..12; l'ordine dell'array è il nuovo position
    id?: number;                         // presente = aggiorna quel pasto, assente = nuovo pasto
    tagId: number;                       // un tag del coach; il nome del pasto è quello del tag
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
- Il piano ha **almeno un pasto** (decisione 2026-11-22): `meals: []` → 400 `"meals must have at least 1 entry"`. Prima era ammesso.
- Ogni `tagId` deve essere un tag **del coach**: un tag inesistente o di un altro coach → 404 `"Meal tag not found"` (stessa risposta nei due casi). Un tag archiviato è ammesso solo dove il piano salvato lo usa già (sezione **Archiviazione**), altrimenti la stessa 404. Lo stesso tag può stare su più pasti (due "Spuntino"). Anche il DB lo garantisce: la FK composta `(tag_id, coach_id)` rifiuta un pasto con il tag di un altro coach.
- Un `id` di pasto presente aggiorna quel pasto (tag, ora, note, posizione); deve essere un pasto **di questo piano**, altrimenti 404 `"Meal not found"`. Cambiare il tag di un pasto tenendo il suo `id` mantiene le registrazioni dell'atleta su quel pasto (restano collegate per `mealId`; il loro `mealName` resta il nome copiato al momento della registrazione). Per "ricominciare da zero" un pasto il pannello lo invia senza `id`.
- Un `id` di voce presente aggiorna quella voce; deve essere una voce **del pasto con cui viene inviata** (stesso piano, stesso pasto), altrimenti 404 `"Meal item not found"`. Una voce non si sposta da un pasto all'altro tenendo l'id: si toglie da uno e si crea nell'altro. Dentro un pasto nuovo (senza `id`) le voci non possono avere `id`.
- Un pasto o una voce esistente il cui `id` non viene inviato è **rimosso**. Le registrazioni dell'atleta per un pasto rimosso restano, con `mealId: null` e il `mealName` copiato al momento della registrazione (FK `on delete set null`).
- Lo stesso `id` ripetuto nel body → 400 `"Duplicate meal id"` / `"Duplicate meal item id"`.
- Nessuna riga di un altro piano viene mai letta o scritta: gli `id` sono controllati sulle righe del piano della coppia, letto dentro la transazione, e ogni `UPDATE` / `DELETE` filtra anche per piano (o pasto).
- Tutta la scrittura avviene in una transazione: il collegamento `coach_athletes` della coppia si legge `FOR SHARE` (manca → 404 `"Client not found"`), poi il piano `FOR UPDATE`. Primi PUT concorrenti: uno solo crea il piano (201); un PUT che inserisce mentre il primo è ancora in corso trova la unique `(coach_id, athlete_id)` → 409 `"Meal plan already exists"`, uno che arriva dopo il commit del primo lo aggiorna (200). Un PUT in corsa con lo scollegamento del cliente risponde come se fosse arrivato prima (201 / 200, poi la cascata cancella il piano) o dopo (404 `"Client not found"`): in nessun caso resta un piano per un ex cliente.

Errori di validazione (400), in quest'ordine di campo:
- `"Invalid request body"` (body non oggetto).
- note del piano: `"notes must be a string or null"`, `"notes must not contain a NUL character"`, `"notes must be at most 1000 characters"`.
- `"meals must be an array"`, `"meals must have at least 1 entry"`, `"meals must have at most 12 entries"`.
- per ogni pasto: `"Invalid request body"` (pasto non oggetto), `"Invalid meal id"` (non intero o `< 1`), `"meals.tagId is required"` (assente o null), `"Invalid meal tag id"` (non intero o `< 1`), `"meals.timeOfDay must be HH:MM or null"`, `"meals.notes must be a string or null"`, `"meals.notes must be at most 500 characters"`, `"meals.items must be an array"`, `"meals.items must have at most 30 entries"`.
- per ogni voce: `"Invalid request body"`, `"Invalid meal item id"`, `"meals.items.food is required"`, `"meals.items.food must be at most 120 characters"`, `"meals.items.quantity must be a string or null"`, `"meals.items.quantity must be at most 60 characters"`.
- i campi di testo con U+0000: `"<campo> must not contain a NUL character"` con lo stesso nome di campo (`meals.notes`, `meals.items.food`, …).
- `"Duplicate meal id"`, `"Duplicate meal item id"`.

Poi: 404 `"Meal not found"`, 404 `"Meal item not found"`, 404 `"Meal tag not found"`, 409 `"Meal plan already exists"`. Prima di tutti, 413 `"Request body too large"` (vedi **Regole comuni**).

**Dopo un 404 o un 409 sul PUT il pannello ricarica il piano** (`GET`, e con `"Meal tag not found"` anche i tag) prima di permettere un nuovo salvataggio. Il caso tipico sono due schede aperte dello stesso coach: la scheda A toglie un pasto, la scheda B salva ancora il suo `id` e riceve 404 `"Meal not found"` / `"Meal item not found"`; oppure entrambe fanno il primo PUT e una riceve 409. Ritentare lo stesso body darebbe lo stesso errore. Vale anche per 404 `"Client not found"` (cliente scollegato nel frattempo): lì il pannello torna alla lista clienti.

### PATCH `/coach/clients/:athleteId/meal-plan`

Body `{ isActive: boolean }` → 200 `MealPlan`. Idempotente: disattivare un piano già disattivato risponde 200 con lo stesso piano (cambia solo `updatedAt`). Disattivare non cancella pasti né registrazioni; riattivare rimette il piano com'era.

Errori: 400 `"Invalid athlete id"`, 404 `"Client not found"`, 400 `"Invalid request body"`, 400 `"isActive must be a boolean"`, 404 `"Meal plan not found"`.

### GET `/coach/clients/:athleteId/meal-logs?from=YYYY-MM-DD&to=YYYY-MM-DD`

200 `{ days: MealDayAdherence[] }`: una riga per giorno da `from` a `to` (inclusi), in ordine di data, anche per i giorni senza registrazioni. Usa i pasti del piano attuale, attivo o no. Senza piano: una riga per giorno con tutti i conteggi a 0 (deciso). Il pannello mostra `removedCount`, quando non è 0, come nota "segni su pasti non più nel piano" (deciso). Per gli ultimi 7 giorni del pannello: `from = oggi - 6`, `to = oggi`.

Errori: 400 `"Invalid athlete id"`, 404 `"Client not found"`, 400 `"from must be YYYY-MM-DD"`, 400 `"to must be YYYY-MM-DD"`, 400 `"to must be on or after from"`, 400 `"Range must be at most 31 days"`.

## Atleta (AL4, non implementata)

Questa parte è la proposta del piano (sezione 5) e verrà rivista al Contract Gate di AL4. Nessuna di queste route esiste dopo AL2.

- `GET /athlete/home`, campo additivo `nutrition: { mealPlanId: number; updatedAt: string } | null`: `null` se l'atleta non ha coach o il piano non c'è o è disattivato (H1: modulo attivo = piano attivo). Con `null` l'app nasconde lo switch Allenamento / Alimentazione. Convive con `coaching` (R6) senza toccarlo.
- `GET /athlete/meal-plan/today` → `{ date: string; mealPlan: (MealPlan & { meals: (Meal & { log: MealLog | null })[] }) | null; nextMealId: number | null }`. `date` è oggi di Roma; `nextMealId` è il primo pasto in ordine senza registrazione per `date` (`nextMealId` in `mealPlan.ts`); `mealPlan: null` senza piano attivo.
- `PUT /athlete/meal-logs` body `{ mealId: number; date: string; status: MealLogStatus; note?: string | null }` → 200 `MealLog`. Idempotente: la unique `(athlete_id, date, meal_id)` tiene una riga sola, due PUT uguali danno lo stesso risultato. `date` deve essere oggi o ieri di Roma (H7, `isLoggableDate`). `mealName` è copiato dal nome del tag del pasto al momento della scrittura.
- `DELETE /athlete/meal-logs?mealId=&date=` → 204, anche se la registrazione non c'era (idempotente). Stessa regola su `date`.
- `GET /athlete/meal-logs?from=&to=` → `{ logs: MealLog[] }`, al massimo 31 giorni, per Progressi.

Errori proposti: 400 `"Invalid request body"`, 400 `"Invalid meal id"`, 400 `"date must be today or yesterday"`, 400 `"status must be done or other"`, 400 `"note must be at most 280 characters"`, 404 `"Meal plan not found"` (nessun piano attivo), 404 `"Meal not found"` (pasto non del piano attivo dell'atleta), più i 400 sull'intervallo come per il coach.

## Decisioni (2026-11-22)

Decise dall'utente il 2026-11-22; sostituiscono le "Decisioni aperte".
1. `removedCount` in `MealDayAdherence` resta: il pannello lo mostra come nota "segni su pasti non più nel piano".
2. Senza piano, `meal-logs` risponde con i giorni a zero (non `{ days: [] }`).
3. Un piano ha almeno un pasto: il PUT con 0 pasti → 400 `"meals must have at least 1 entry"` (prima era ammesso).
4. Una voce non si sposta da un pasto all'altro tenendo l'id (regola del PUT).
5. Tag dei pasti al posto del nome libero, con i tag iniziali, rinomina che vale ovunque tranne nei log, archiviazione al posto della cancellazione (sezione **Tag dei pasti**).
6. Template di giornata con solo tag e orario; "applica" è lato pannello con il normale PUT (sezione **Template di giornata**).

Da confermare: i tetti di tag e template (30 / 20 per coach, 12 pasti per template, 60 caratteri per i nomi) e la forma del riordino (`position` nel PATCH, un tag alla volta).
