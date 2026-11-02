# Contratto — Logging della sessione atleta (tetto alle serie, limite agli avvii)

Stato: **approvato il 2026-10-27** (branch `fix/session-set-limits`, task L1–L6).
Origine: review di sicurezza di R5. Un atleta collegato poteva registrare serie senza limite e rallentare il calcolo dei record del coach.
Codice: route `be/src/routes/sessions.ts`, validazione `be/src/services/sessionValidation.ts` e `exerciseSetValidation.ts`, limite `be/src/middleware/sessionStartRateLimit.ts`.

Questo documento copre solo cosa cambia. Il resto delle route di sessione resta com'è nel codice.

## Valori

| Costante (`sessionValidation.ts`) | Valore | Dove vale |
| --- | --- | --- |
| `MAX_SETS_PER_EXERCISE` | 30 | `setNumber` massimo di una serie registrata; serie prescritte per esercizio (`setPrescriptions`, campo `sets` vecchio) |
| `MAX_SETS_PER_SESSION` | 200 | serie salvate in una sessione |
| avvii di sessione per utente | 30 in 24 h | `POST /workouts/:workoutId/sessions` |

Perché questi valori: nei dati di sviluppo il massimo è 5 serie per esercizio, 23 per sessione e 24 prescritte per giorno. 30 copre un 10×10 o un EMOM di 30'. 200 equivale a 15 esercizi da 13 serie.

## Regole comuni

- Errori: sempre `{ "error": string }` in inglese; la copy italiana sta nel client.
- **Additivo per il mobile in produzione**: il mobile chiude la sessione con un solo `PATCH` che porta tutte le serie. Un 4xx sulla chiusura (salvo 401) fa cancellare al telefono **tutta** la sessione. Per questo la chiusura non viene mai rifiutata per il tetto: salva solo le serie che rientrano.
- I tetti valgono per le **nuove scritture**. Le serie e le prescrizioni già salvate non vengono toccate, e le risposte non hanno un massimo negli schemi Zod.

## Chiusura — `PATCH /sessions/:id` con `sets`

Nessun errore nuovo. Il server tiene ciò che sta nel tetto, in quest'ordine:

1. Lascia fuori ogni serie il cui `setNumber`, convertito con `Number()` come fa la validazione, è un intero maggiore di 30 (quindi anche la stringa `"31"`). Lo fa prima di validarla: una serie scartata non può far fallire la chiusura. Un `setNumber` che non diventa un intero (`30.5`, `-1`, assente) resta e la validazione lo rifiuta con 400 come prima.
2. Valida le altre come prima: una serie non valida dà 400 come oggi; i duplicati `exerciseId` + `setNumber` danno 400.
3. Se restano più di 200 serie, tiene le prime 200 in ordine di `loggedAt`. Una serie senza `loggedAt` viene salvata con l'orario di chiusura, quindi conta come ultima. A parità resta l'ordine di invio.

Risposta: 200 con la sessione e le serie **salvate**. Il client che vuole sapere se ne mancano confronta le serie della risposta con quelle inviate. Un client vecchio vede la chiusura riuscita e cancella il diario dal telefono: perde solo le serie oltre il tetto.

## Serie singole — `POST /sessions/:id/sets` e `PUT /sessions/:id/sets/:exerciseId/:setNumber`

Nessun client in produzione le usa (il mobile chiude con il `PATCH`, il web non registra serie).

| Codice | `error` | Quando |
| --- | --- | --- |
| 400 | `setNumber must be an integer between 1 and 30` | `setNumber` non intero, `< 1` o `> 30` (prima: `setNumber must be a positive integer`) |
| 409 | `Session already has 200 sets` | `POST`: la sessione ha già 200 serie. `PUT`: la sessione ha già 200 serie in **altre** posizioni (sovrascrivere una serie esistente è sempre permesso) |

Ordine dei controlli: id 400 → body 400 → sessione 404 → stato 409 → esercizio 400 → (`PUT`: `loggedAt` 400) → tetto 409.

**Concorrenza**: stato, conteggio e scrittura stanno in una transazione che blocca prima la riga `workout_sessions` con `SELECT ... FOR UPDATE`. Lo stato si ricontrolla dopo il lock (409 `Session is not in progress`). Anche la chiusura con `sets` prende lo stesso lock, prima di sostituire le serie. Così il tetto è esatto anche con richieste in parallelo, e una scrittura partita mentre la sessione si chiude non aggiunge serie dopo la chiusura: o finisce prima, o trova la sessione chiusa. Una sola sessione per volta è in corso per utente, quindi il lock non rallenta nessun altro.

## Prescrizioni — `POST`/`PUT` esercizio e `POST /workouts/program`

| Codice | `error` | Quando |
| --- | --- | --- |
| 400 | `setPrescriptions must have at most 30 sets` | più di 30 serie prescritte |
| 400 | `sets must be an integer between 1 and 30` | campo `sets` vecchio fuori range (prima: `sets must be a positive integer`) |

Il pannello web e il builder del mobile bloccano già nel form: "+ Aggiungi serie" si disattiva a 30, l'import TXT rifiuta un esercizio con più di 30 serie e la validazione mostra "Un esercizio può avere al massimo 30 serie". Gli schemi Zod di richiesta (`setPrescriptionsRequestSchema`) hanno lo stesso massimo.

## Avvio — `POST /workouts/:workoutId/sessions`

| Codice | `error` | Quando |
| --- | --- | --- |
| 429 | `Too many sessions started. Try again later` | 31° tentativo dello stesso utente nella finestra di 24 h aperta dal primo |

- Header `Retry-After` in secondi.
- Conta ogni tentativo, anche quelli che poi falliscono (come `authRateLimit`).
- Contatore in memoria per `user.id`: c'è una sola istanza su Railway, una seconda non lo condividerebbe; si azzera a ogni deploy.
- L'avvio è sempre online e il mobile mostra l'errore a schermo. La chiusura non ha limiti, per la regola sul `PATCH` vista sopra.

## Copy italiana

| `error` | Mobile (`mobile/src/api/client.ts`) |
| --- | --- |
| `setNumber must be an integer between 1 and 30` | Puoi registrare al massimo 30 serie per esercizio. |
| `Session already has 200 sets` | Hai raggiunto il massimo di 200 serie in questa sessione. |
| `setPrescriptions must have at most 30 sets` | Un esercizio può avere al massimo 30 serie. |
| `sets must be an integer between 1 and 30` | Un esercizio può avere al massimo 30 serie. |
| `Too many sessions started. Try again later` | Hai avviato troppi allenamenti nelle ultime 24 ore. Riprova più tardi. |

Web: `fe/src/api/knownErrorMessages.ts` arriva con R3 (non è ancora su `main`). Il pannello non registra serie e non avvia sessioni. Gli errori sulle prescrizioni li ferma prima il form. Quando R3 sarà su `main`, si aggiunge la riga `setPrescriptions must have at most 30 sets`.

## Rilascio

1. Prima di rilasciare, in produzione, una query di sola lettura: nessun esercizio con più di 30 righe in `exercise_sets` e nessun `exercises.sets` sopra 30. Se ce ne sono, quel coach non potrà più salvare la scheda senza togliere serie: va avvisato oppure si alza il tetto.
2. Deploy del backend (nessuna migrazione).
3. Il mobile si aggiorna dopo: le versioni vecchie funzionano senza modifiche (vedi Chiusura).
4. Rollback: revert del backend. Non ci sono dati da riportare indietro.
