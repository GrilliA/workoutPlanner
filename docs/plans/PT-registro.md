# PT — Registro pagamenti, Oggi e Business

Obiettivo: dare al PT di coaching online un registro dei pagamenti dei clienti e, sopra quello, una schermata **Oggi** che dice chi seguire, chi deve pagare e chi rischia di andarsene. Nessun incasso in app.

Riferimento visivo: canvas Design "traccia — workoutPlanner", riga **PT · registro pagamenti, Oggi e business** (`PTOggi`, `PTClienti`, `PTCliente`, `PTPagamento`, `PTListino`, `PTBusiness`, `AtletaStatoCoaching`). Decisioni: [`WORKBOOK.md`](../../WORKBOOK.md), voci del 2026-10-22.

## Cosa è già deciso

| Tema | Decisione |
| --- | --- |
| Pagamenti | Registro: il PT segna i pagamenti, noi non tocchiamo soldi |
| Modello | Listino → abbonamento del cliente → **pagato fino al**. Registrare un pagamento sposta la data di N periodi a partire dalla **vecchia scadenza** |
| Stato | Ricavato dalla data: in regola / in scadenza (≤ 7 g) / scaduto / in pausa. Nessuna rata futura salvata |
| Pausa | Un periodo dal / al, al massimo una attiva. Sposta "pagato fino al" della sua durata e toglie il cliente da avvisi, rischio ed entrate attese. Non tocca la scheda |
| Insoluto | Non blocca nulla |
| Rischio abbandono | Regola spiegabile: alto = scade entro 14 g **e** (frequenza < 50% **o** nessuna sessione da 7+ g); medio = una sola condizione |
| Oggi | Una riga per cliente, ordinata per urgenza. "Gestito" nasconde per 7 g, la voce torna prima se peggiora |
| Atleta | Vede il suo stato in Home, senza prezzi né pulsanti di pagamento |
| Fuori da questo piano | Incasso reale (Stripe), check-in settimanale, palestre, fatturazione del PT verso di noi |

## Modello dati (proposta)

Soldi in **centesimi interi**, date come `date` (giorno di Roma, `todayInRome()` esiste già).

| Tabella | Campi principali | Note |
| --- | --- | --- |
| Listino `coach_offers` | `coachId`, `name`, `priceCents`, `periodUnit` (`month` \| `week`), `periodCount`, `isRecurring`, `archivedAt` | Archiviare invece di cancellare: gli abbonamenti attivi la puntano |
| Abbonamento `client_subscriptions` | `coachId`, `athleteId` (unici insieme), `offerId`, `agreedPriceCents`, `periodUnit`, `periodCount`, `isRecurring`, `startedOn`, `paidThrough`, `billingDay`, `endedOn` | Copia prezzo e periodo dal listino alla creazione: cambiare il listino non tocca i clienti. Quando il cliente smette resta con `endedOn`, così Business conta i clienti persi |
| Pagamento `subscription_payments` | `subscriptionId`, `amountCents`, `paidOn`, `method` (`cash` \| `bank_transfer` \| `satispay` \| `paypal` \| `other`), `periods`, `coversFrom`, `coversTo`, `note` | Storico. `paidThrough` si aggiorna nella stessa transazione |
| Pausa `subscription_pauses` | `subscriptionId`, `startsOn`, `endsOn`, `cancelledAt` | Crearla sposta `paidThrough` in avanti; annullarla lo riporta indietro |
| Gestito `coach_inbox_handled` | `coachId`, `athleteId`, `handledAt`, `severityAtHandle` | La voce torna se la gravità attuale supera quella salvata o dopo 7 g |
| Testi WhatsApp | tre testi per coach (scadenza, scaduto, si allena poco) | Valori di default nel codice finché il PT non li cambia |

`paidThrough` è salvato, non ricalcolato dai pagamenti. Il motivo è la pausa: ricalcolarla dallo storico vorrebbe dire rigiocare pagamenti e pause in ordine a ogni lettura.

## Logica pura (con unit test, `be/src/services/*.test.ts`)

1. **Avanzare la data di N periodi**: i mesi arrivano al `billingDay`, o all'ultimo giorno se il mese è più corto (31 gen → 28 feb → 31 mar); le settimane in giorni. Un pagamento parte dalla vecchia scadenza (ritardo) o dal giorno del pagamento (rientro dopo più di un periodo intero): il sistema propone, il PT sceglie nel dialog; ripartire dal giorno del pagamento lo fa diventare il nuovo `billingDay`. Una pausa sposta scadenza e `billingDay`.
2. **Stato abbonamento** da `paidThrough`, oggi e pausa attiva.
3. **Rischio abbandono**: input sessioni nelle ultime 2 settimane, sessioni previste (giorni della scheda × 2), giorni dall'ultima sessione, giorni alla scadenza, pausa. Output livello + motivi in italiano. Senza scheda attiva conta solo "giorni dall'ultima sessione".
4. **Inbox Oggi**: unisce rischio, pagamenti, scheda in scadenza (`buildCoachAlerts` di oggi) e PR in una riga per cliente; ordina; applica "Gestito".
5. **Numeri business**: entrate ricorrenti mensili (trimestrale / 3, 12 settimane / 2,77), incassato per mese, atteso nei prossimi 30 g, rinnovi negli ultimi 90 g.

## API (proposta)

| Metodo | Route | A cosa serve |
| --- | --- | --- |
| GET, POST | `/coach/offers` | listino |
| PATCH | `/coach/offers/:id` | modifica, archivia |
| PUT | `/coach/clients/:athleteId/subscription` | crea o cambia abbonamento |
| GET, POST | `/coach/clients/:athleteId/payments` | storico, registra pagamento |
| DELETE | `/coach/clients/:athleteId/payments/:id` | annulla **solo l'ultimo** pagamento (errore di battitura) |
| POST, DELETE | `/coach/clients/:athleteId/pause` | metti / togli pausa |
| GET | `/coach/clients` | aggiunge stato abbonamento, frequenza, rischio |
| GET | `/coach/today` | inbox Oggi |
| POST | `/coach/today/:athleteId/handled` | Gestito |
| GET | `/coach/business?range=6m\|12m` | pannello business |
| GET, PUT | `/coach/message-templates` | testi WhatsApp |
| GET | `/athlete/home` | aggiunge `coaching: { status, paidThrough, pausedUntil, coachName }` o `null` |

Contratto in inglese, copy in italiano nei client (decisione 2026-09-08).

## PR (in ordine)

| PR | Contenuto | Dipende da | Dim. |
| --- | --- | --- | --- |
| **R1** | Schema + migrazione (listino, abbonamento, pagamento, pausa) e logica pura 1–2 con test | — | M |
| **R2** | API listino, abbonamento, pagamenti, pausa. Smoke E2E: crea offerta → abbonamento → pagamento → pausa | R1 | M |
| **R3** | Pannello: Impostazioni › Listino; tab **Abbonamento** nel dettaglio cliente; dialog Registra pagamento; pausa | R2 | L |
| **R4** | Pannello: tabella Clienti con stato, frequenza, filtri (compreso "Senza abbonamento" per l'onboarding) | R2 | M |
| **R5** | Rischio abbandono + inbox: logica 3–4, `/coach/today`, Gestito; pagina **Oggi** al posto della dashboard (riusa il feed attività) | R2 | L |
| **R6** | Mobile: riga stato coaching in Home e nella sezione COACH di Account | R2 | S |
| **R7** | Testi WhatsApp in Impostazioni + telefono facoltativo sull'abbonamento + pulsanti Ricorda / Scrivi su Oggi e cliente | R3, R5 | S |
| **R8** | Pagina **Business**: logica 5, `/coach/business`, voce di menu | R2 | M |

R3, R4, R5, R6 e R8 possono andare in parallelo dopo R2: toccano cartelle diverse. R5 chiude anche **P1 — Alert actionable** del WORKBOOK: la lista azionabile è l'inbox Oggi.

Verifica a ogni PR: `be` typecheck + test, `fe` lint + build, `mobile` typecheck; poi giro vero su DB usa e getta (pannello nel browser, app sul telefono).

## Scelte fatte (2026-10-22)

1. **Telefono per WhatsApp.** Oggi `users` non ha un telefono. Fino a R7 i pulsanti aprono `wa.me/?text=…` e il PT sceglie il contatto. In R7 si aggiunge un campo telefono facoltativo sull'abbonamento, compilato dal PT: se c'è, il link diventa `wa.me/<numero>?text=…`.
2. **Fasce.** Il piano non applica limiti per fascia: registro e Business sono visibili a tutti. Si bloccano dopo, quando decidiamo come farci pagare dal PT.
3. **Nomi.** Tabelle `coach_offers`, `client_subscriptions`, `subscription_payments`, `subscription_pauses`, `coach_inbox_handled`. Logica in `be/src/services/` come il resto (`subscription.ts`, `churnRisk.ts`, `coachToday.ts`, `coachBusiness.ts`). Nomi nuovi che nascono nelle PR seguono ancora la regola di `docs/guidelines/agents.md`.

## Prima di R3

1. **Mockup e dati.** Le tavole PT usano numeri dimostrativi, mentre M4 dice "valori ignoti tra parentesi quadre". Il grafico Business colora il mese in corso in indaco tenue, mentre M4 lo vuole arancio. Da allineare sul canvas prima di R3.
