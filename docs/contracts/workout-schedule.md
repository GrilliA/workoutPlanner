# Contratto — Date delle route del calendario

Stato: **approvato** il 2026-11-02 (Contract Gate, run RUN-0017 / T1).

Una data di calendario impossibile sulle route del calendario risponde 400. Prima il controllo guardava solo la forma `YYYY-MM-DD`, quindi la data arrivava fino al calcolo o al database. Forma della risposta di successo, route e permessi non cambiano.

## Regola

Una data è valida se ha la forma `YYYY-MM-DD` **e** esiste sul calendario: `isValidIsoDate` (`be/src/services/assignmentStatus.ts`, la stessa di assegnazioni e registro) la riporta in anno, mese e giorno e li confronta con quelli ricevuti. Il controllo sta in `parseScheduledDate` (`be/src/services/workoutSchedule.ts`), che ora usa anche `validateScheduleOverrideInput`.

Ogni route tiene il messaggio che ha già, col nome del proprio campo. Nessuna stringa nuova.

## Prima e dopo

Tutte sotto `/api/workouts/:workoutId/schedule`. Valori di prima misurati su `smoke_test` (RUN-0017), non dedotti dal codice.

| Route | Campo | `2026-13-45` prima | `2026-02-30` prima | Dopo, per entrambe |
| --- | --- | --- | --- | --- |
| `GET /today` | `?date=` | 500 | 200 con `date: "2026-02-30"` e il giorno del 2 marzo | 400 `date must be YYYY-MM-DD` |
| `GET /week` | `?from=` | 500 | 200, settimana dal 2 marzo | 400 `from must be YYYY-MM-DD` |
| `POST /overrides` | `scheduledDate` | 500 | 500 | 400 `scheduledDate must be YYYY-MM-DD` |
| `DELETE /overrides/:date` | `:date` | 500 | 500 | 400 `date must be YYYY-MM-DD` |

Restano uguali:

- `GET /today` senza `date` usa la data di oggi.
- Le date reali dall'anno `0100` in poi, 29 febbraio degli anni bisestili compreso. Per gli anni precedenti vedi sotto.
- L'ordine dei controlli: il filtro su `/:workoutId/schedule` in `be/src/routes/workouts.ts` risponde prima di guardare la data. Una data impossibile su un workout che non esiste, o di un altro utente, risponde 404 `Workout not found`, come una data di forma sbagliata.
- Il corpo dell'errore: `{ "error": string }` in inglese.

## Effetto sugli anni fuori dal normale

`isValidIsoDate` rifiuta gli anni da `0000` a `0099`, perché `Date.UTC` li legge come 1900–1999. Ora danno 400 su tutte e quattro le route. Prima la risposta dipendeva dalla data, e non era sempre un errore:

| Data | `GET /today` | `GET /week` | `POST /overrides` | `DELETE /overrides/:date` |
| --- | --- | --- | --- | --- |
| `0000-01-01` | 200 | 500 | 500 | 500 |
| `0099-01-01` | 500 | 200 | 201 | 204 |

Nessun client manda queste date. Un override già salvato con un anno sotto `0100` non si potrebbe più cancellare via API; questa riga vecchia non è stata provata, e la presenza di righe così in produzione non è stata controllata.

## Non coperto da questo contratto

Tutti preesistenti: restano come sono, e ognuno va deciso a parte.

| Input | Risposta | Perché resta fuori |
| --- | --- | --- |
| `GET /week?from=9999-12-26` … `9999-12-31` | 500 | La data esiste, ma i sette giorni escono da quelli che `addDaysToDateKey` sa scrivere. `isCalendarDate` di `subscriptionValidation.ts` lo risolve per il registro con gli anni 2000–2099; adottarlo qui rifiuterebbe date che oggi passano |
| `GET /today?date=` vuoto | 200 con `date: ""` e i dati di oggi | `dateParam ?? ...` non scatta sulla stringa vuota. I client non lo mandano |
| `GET /today?date=a&date=b`, `?date[]=x` | 200 con i dati di oggi, la data viene ignorata | Il parametro non è una stringa. `/week` con gli stessi input dà 400 |
| `:date` o `:workoutId` con `%` malformato (`%ZZ`) | 500 | L'errore nasce nel router e vale per ogni route con parametri |
| `:workoutId` numerico fuori da int32 (`2147483648`, `1.5`) | 500 | Il filtro controlla solo `NaN` |
| `workoutDayId` oltre int32 su `POST /overrides` | 500 | Il validatore non ha un limite superiore |

## Consumer

| Pacchetto | Chiama queste route? | Effetto del 400 |
| --- | --- | --- |
| `fe/` | No. `fe/src/api/workoutdays.ts` definisce `getWorkoutScheduleToday`, `setScheduleOverride`, `deleteScheduleOverride`, `fe/src/api/index.ts` le riesporta, nessuna pagina le usa (rimosse in `a7ba965`) | Nessuno. Se tornassero in uso, `ApiError.messageFrom` mostrerebbe il testo inglese: `knownErrorMessages.test.ts` fissa che `date must be YYYY-MM-DD` non ha traduzione |
| `mobile/` attuale | No. Stesse funzioni in `mobile/src/api/workoutdays.ts` più `getWorkoutScheduleWeek`, nessuna schermata le usa (rimosse in `0e24bc4`, #83) | Nessuno |
| `mobile/` build precedenti a `0e24bc4` | Sì: `GET /today` senza `date`, `GET /today?date=` (fino a `5d69476`) e `GET /week?from=` | Nessuno: `date` e `from` vengono da `buildRomeWeekDateKeys`, che calcola la settimana da una `Date`, quindi sono sempre date reali. Quelle build non chiamano `/overrides` |
| Vecchia shell Capacitor (`fe/ios`, `fe/android`, rimossa in `ba367d4`) | Sì: `GET /today`, anche con `?date=`, `POST /overrides` e `DELETE /overrides/:date` | Atteso nessuno: le date vengono dal calendario dell'app. Letto solo in parte, e non sappiamo se esistono ancora installazioni |
| `apps/android/` | No (nessun riferimento a `schedule` nei sorgenti) | Nessuno |
| `landing/` | No | Nessuno |

Gli schemi Zod di `scheduleOverrideRequestSchema` in `fe/src/api/schemas/workoutday.ts` e `mobile/src/api/schemas/workoutday.ts` controllano solo la forma: restano validi, perché il backend è più severo e non più permissivo. Le risposte di successo non cambiano, quindi `workoutScheduleSchema` e `scheduleOverrideResponseSchema` non si toccano.

## Compatibilità e rilascio

- Strategia: nessuna versione nuova. Il cambio riguarda input che prima davano 500 o una risposta sbagliata, più gli anni `0000`–`0099` qui sopra. Nessun client attuale li manda.
- Il backend può uscire da solo, prima del mobile e del pannello: nessuna modifica di client serve.
- Nessuna migrazione. In tabella non possono esserci date impossibili: la colonna è `date` e Postgres le rifiuta. Possono esserci solo gli anni sotto `0100`, se qualcuno li ha salvati.
- Rollback: tornare al codice precedente. Nessun dato da riallineare.

## Test

- `be/src/services/workoutSchedule.test.ts`: `parseScheduledDate` su date impossibili, bisestile e anni `0000`–`0099`.
- `be/src/e2e/schedule.e2e.test.ts`, su `smoke_test`: le quattro route con `2026-13-45`, `2026-02-30` e `2026-02-29`, 404 su workout inesistente e di un altro utente, `scheduledDate` non stringa, date reali su `GET` e su override.
