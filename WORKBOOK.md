# workoutPlanner — Workbook

A living log of **decisions made**, **what we did**, and **what to do next**. Update this file whenever we make a meaningful decision or finish a piece of work, so we always remember the context.

How to use:
- Add new entries to the top of each list (most recent first).
- Keep entries short: what + why.
- Move items from "Next steps" to "What we did" when completed.

---

## Decisions log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-26 | R4 Clienti con stato: contratto in [`docs/contracts/pt-clienti.md`](docs/contracts/pt-clienti.md). `GET /coach/clients` aggiunge per riga `subscription` (stato R2 + `paidThrough`, o `null`), `lastSessionOn` e `last14Days { completedSessions, expectedSessions }`: sessioni completate negli ultimi 14 giorni di Roma contro i giorni della scheda attiva × 2 (`trainingFrequency` in `be/src/services/clientActivity.ts`), `null` senza scheda. Filtri solo nel client con `?stato=` (`in-scadenza`, `scaduti`, `in-pausa`, `senza-abbonamento`); un abbonamento chiuso sta in "Senza abbonamento". Nessun indice nuovo. Al rilascio il BE va in produzione prima del FE | Una sola chiamata per la tabella e cambio additivo; il mobile non usa la route. La frequenza è una funzione pura che R5 riusa per il rischio abbandono. Un chiuso va reimpostato come un cliente senza abbonamento. Gli indici si valutano con `EXPLAIN ANALYZE` quando i dati crescono. Lo schema FE rifiuta la risposta vecchia: con Pages prima di Railway Clienti, dashboard e "Nuova assegnazione" si romperebbero per qualche minuto |
| 2026-10-26 | R3 registro PT nel pannello. Dettaglio cliente a tab con sotto-route (`/clients/:id` Allenamenti, `/clients/:id/subscription` Abbonamento) e Impostazioni a tab (`/settings`, `/settings/offers`); la voce di menu resta attiva sulle sotto-route. Errori del BE tradotti con una mappa unica (`fe/src/api/knownErrorMessages.ts`) usata da `ApiError.messageFrom`, come sul mobile; un errore non in mappa resta in inglese. L'anteprima della pausa è un helper puro nel client che replica `applyPause`; quella del pagamento viene dal BE. Durata dell'offerta = numero 1..52 + mesi/settimane; metodo proposto = quello dell'ultimo pagamento registrato; chiudi/riprendi abbonamento già in R3 | Le sotto-route danno link diretti che Oggi (R5) e Clienti (R4) useranno. La mappa unica evita copy diverse per lo stesso errore; il fallback generico avrebbe cambiato login e registrazione. Un endpoint di anteprima pausa sarebbe stato un cambio di contratto per una regola di una riga, coperta da un confronto con il BE su 14.110 casi. Senza chiusura R8 conterebbe i clienti persi solo dallo scollegamento |
| 2026-10-23 | R2 registro PT: contratto in [`docs/contracts/pt-registro.md`](docs/contracts/pt-registro.md). L'ordine delle operazioni si decide con un contatore `revision` per abbonamento: pagamento, pausa, cambio di periodo o di `startedOn` fanno +1, annullare l'ultima operazione fa −1. Pagamenti e pause salvano scadenza e giorno di rinnovo precedenti (migrazione 0015 additiva), così l'annullamento è esatto. La pausa sposta la scadenza della sua durata solo se il cliente era pagato al suo inizio. Lo scollegamento chiude l'abbonamento (`endedOn`), ma il coach continua a leggere abbonamento e storico dell'ex cliente. Limite accettato: un pagamento dopo una pausa che non ha spostato nulla non salta la pausa (avviso nel dialog di R3). Il parser JSON risponde 400/413/415 invece di 500 su tutte le route e non scrive più il body nei log | I timestamp di Postgres sono l'ora d'inizio della transazione e dopo un'attesa sul lock possono risultare fuori ordine; un contatore preso sotto lock no. Salvare i valori precedenti evita di rigiocare lo storico. Uno scaduto messo in pausa non deve guadagnare giorni. Un atleta che si scollega non deve nascondere al coach un insoluto. Il body grezzo nei log esponeva le password di `/auth/login` |
| 2026-10-22 | Track PT ([`docs/plans/PT-registro.md`](docs/plans/PT-registro.md)): tabelle `coach_offers`, `client_subscriptions`, `subscription_payments`, `subscription_pauses`, `coach_inbox_handled`; logica in `be/src/services/`. WhatsApp senza numero (`wa.me/?text=…`, il PT sceglie il contatto) fino a R7, poi telefono facoltativo sull'abbonamento compilato dal PT. Nessun limite per fascia in questo track | Nomi allineati a quelli esistenti (`coach_athletes`, `program_assignments`) e una sola cartella di servizi come il resto del backend. `users` non ha telefono: il link senza numero funziona subito, e il telefono resta un dato che il PT ha già |
| 2026-10-22 | Design PT (canvas "traccia — workoutPlanner", riga "PT · registro pagamenti, Oggi e business"): un pagamento in ritardo fa partire il nuovo periodo dalla **vecchia scadenza**, non dalla data del pagamento. La dashboard diventa **Oggi**: una riga per cliente (non per avviso), ordinata per urgenza; **Gestito** nasconde la voce per 7 giorni e la fa tornare prima se la situazione peggiora; la voce sparisce da sola quando si registra il pagamento o si assegna la scheda. Nuova voce di menu **Business**; listino e testi WhatsApp in Impostazioni. Dettaglio cliente a tab Abbonamento / Allenamenti / Schede. Il piano del PT si vede sotto il suo nome nella barra laterale. Cliente scaduto in app: "Coaching da rinnovare · La scheda resta attiva" | Continuità della data: chi paga in ritardo non guadagna giorni e lo storico resta senza buchi. Una riga per cliente evita che Giulia compaia tre volte per tre avvisi. Gestito senza scadenza nasconderebbe peggioramenti veri. Il testo per il cliente non deve sembrare un blocco, perché non blocchiamo nulla |
| 2026-10-22 | Prodotto in tre moduli sullo stesso nucleo (app atleta + log): **utente singolo** (acquisizione), **PT**, **palestra**. Si parte dal PT, target **coaching online** (abbonamenti ricorrenti). Il PT ci paga a **fasce flat** per numero di clienti collegati (`coach_athletes`); registro e inbox nella fascia media, pannello business e rischio abbandono in quella alta | Un PT con 20-40 clienti è una micro-impresa: gli servono azioni (chi seguire, chi rinnovare), non grafici. Il conteggio dei clienti collegati esiste già ed è difficile da aggirare. Palestra (più coach, soldi della palestra) dopo: il rapporto commerciale non va legato rigidamente al coach |
| 2026-10-22 | Pagamenti = **registro**, nessun incasso in app (supera il non-goal "billing UI" del 2026-09-08). Listino del PT (nome, prezzo, durata) → abbonamento del cliente (offerta, prezzo concordato, inizio, rinnovo) → **"pagato fino al"**: registrare un pagamento (importo, data, metodo) la sposta di un periodo. Stato ricavato dalla data: in regola / in scadenza (≤7g) / scaduto. Niente rate future generate. Promemoria = link WhatsApp con testo precompilato inviato dal PT | I clienti dei PT pagano in contanti, bonifico, Satispay: Stripe Connect porterebbe onboarding, rimborsi e fatturazione elettronica senza coprire questi casi. Una data per cliente evita una macchina di materializzazione (stessa scelta delle analytics del 2026-08-20) e rende l'onboarding di 25 clienti tre campi ciascuno. Il modello lascia agganciare un incasso reale più avanti |
| 2026-10-22 | Pausa abbonamento dal primo giro: un periodo (dal / al), al massimo una attiva, sposta "pagato fino al" della sua durata e toglie il cliente da alert, rischio abbandono ed entrate attese. Non tocca la scheda. Il cliente vede il suo stato in app (attivo fino al / scade il / da rinnovare / in pausa), senza prezzi né pulsanti di pagamento. **Un insoluto non blocca nulla**: decide il PT | Nel coaching online le pause (vacanze, infortunio) sono frequenti e senza pausa l'inbox si riempie di falsi allarmi. Bloccare per errore un cliente pagante costa più di un insoluto non visto |
| 2026-10-22 | **Rischio abbandono** = regola spiegabile, non un modello: frequenza ultime 2 settimane contro i giorni della scheda, giorni dall'ultima sessione, giorni alla scadenza. Alto = scade entro 14g e (frequenza < 50% o nessuna sessione da 7+ giorni); medio = una sola condizione. Ogni segnalazione mostra il motivo per esteso. Check-in settimanale (peso, energia, sonno) rimandato a una fase separata | È l'incrocio allenamento + pagamento che i concorrenti non fanno, e i dati ci sono già. Il PT deve capire perché un cliente è segnalato. Il check-in porta dati sanitari (GDPR art. 9) |
| 2026-10-17 | Chi si iscrive alla waitlist non riceve email. Con SMTP parte solo l'avviso a `WAITLIST_NOTIFY_TO` | Per ora non confermiamo l'iscrizione. La mail di lancio resta un passo successivo |
| 2026-10-17 | La landing non mostra placeholder legali. Contatto privacy, nome del titolare e P.IVA/CF, e informativa completa stanno solo in `be/src/waitlist/README.md` | I visitatori non devono vedere TODO. I dati mancanti restano in documentazione finché non ci sono |
| 2026-10-17 | La whitelist vive tutta in `be/src/waitlist/`: `POST /api/waitlist` sul backend Railway, tabella `waitlist_signups`, avviso interno con nodemailer. SMTP solo da env; se manca, l'iscrizione si salva e si logga un warning. CORS della route solo `https://grillia.github.io` (sostituibile), rate limit per IP, body max 2kb | Alessio vuole il suo backend, non Brevo, e un solo posto da aprire per cambiare la lista. L'URL pubblico è già `https://workoutplanner-production-974a.up.railway.app` |
| 2026-10-17 | Landing pre-lancio in `landing/` (Astro statico), sullo stesso sito GitHub Pages del pannello: l'app resta `https://grillia.github.io/workoutPlanner/`, la whitelist è `https://grillia.github.io/workoutPlanner/landing/`. Il form legge `PUBLIC_WAITLIST_ENDPOINT` (variabile di repository, non un secret); se manca mostra l'esito demo | Pages permette un solo sito per repo. Il pannello è già alla radice del project site: metterlo in una sottocartella sposterebbe l'URL. La landing si aggiunge sotto `/landing/` |
| 2026-10-17 | M4 design **Sole** (proposta C): app atleta e pannello coach su tema **chiaro** crema `#FFF8F1`, arancio `#FF7A45` solo come riempimento con testo cacao `#231A14` (mai bianco), testo arancio `#A33A12`, dati in indaco `#3B3F9E`, font **Plus Jakarta Sans**. Token semantici (`colors.ts` / `tokens.css`), contrasto ≥ 4.5:1 controllato da `scripts/check-contrast.mjs`. Dark mode fuori da M4. Piano: [`docs/plans/M4-design-sole.md`](docs/plans/M4-design-sole.md) | Il tema scuro azzurro risultava freddo e tecnico; l'app deve essere semplice, amichevole e premium. M3 decide la struttura, M4 l'aspetto: le schermate M3 ancora da fare nascono già in stile Sole |
| 2026-10-16 | W9: carico e intensità **per serie** su `exercise_sets` (non per esercizio); intensità solo come **RIR** intero 0–10 (RPE nel TXT convertito, RIR = 10 − RPE); carico = `load_value` + `load_unit` (`kg` \| `percent_1rm`), entrambi o nessuno; range = `reps` (minimo, obbligatorio) + `reps_max` facoltativo; note su `exercises.notes` | Per serie permette top set + back-off; RIR coincide con `logged_sets.rir` già esistente; `reps` resta il minimo, così log e precompilato non cambiano. Alternative scartate: campi per esercizio (niente rampe), scala RPE/RIR + valore decimale (doppia validazione, confronto col log da convertire), due colonne kg/% (vincolo "solo una") |
| 2026-10-16 | Logging offline della sessione atleta (track **O**, O1–O9) = **fotografia della sessione** sul telefono: diario in `Documents/session/<userId>/offline-log.json` salvato a ogni azione, inviato **una volta** con TERMINA (`PATCH /sessions/:id` con `status`, `completedAt` e tutte le serie con il loro `loggedAt`), poi all'avvio, al login e al ritorno in primo piano con attesa crescente 2 s → 60 s. Resta online solo l'avvio della sessione | Prima scelta (coda di scritture per serie, O6–O7 originali) scartata: revisioni, conferme e concorrenza fra invio e azioni dell'atleta raddoppiavano il codice. Il coach vede le serie solo a fine allenamento, accettabile per il primo rilascio. Chiusura ripetibile (#62) e orari clamped dentro la sessione (#63, #69) rendono sicuro il reinvio |
| 2026-10-07 | Track **N**: app atleta Android nativa in `apps/android/` (`com.traccia.android`, Kotlin + Compose + Hilt + Retrofit), 12 PR in 5 ondate eseguibili in parallelo da Devin Cloud. Piano: [`docs/plans/android-native.md`](docs/plans/android-native.md). L'app Expo resta fino a parità (N12) | Imparare Kotlin/Android su un prodotto vero; contratto comune (route, DTO, stringhe per feature) per evitare conflitti fra sessioni parallele |
| 2026-09-28 | M2 builder scheda mobile = **una bozza locale** (`WorkoutDraft`: giorni → esercizi → serie) in un solo `WorkoutBuilder` per create/edit, salvata con **un** `saveWorkoutProgram` (POST / PUT upsert per id). Esercizi dal catalogo (o custom), import TXT riempie la bozza. Delete di esercizi già loggati resta com'è (cascade) → P2 | Le vecchie schermate avevano 1 giorno fisso, niente catalogo, 3 "Salva" separati e API per singola operazione; il PUT programma esiste già e fa diff per id |
| 2026-09-08 | Lo smoke E2E vive in un job CI **separato** (`Smoke`) con Postgres di servizio e schema da `db:migrate`, non dentro il job Backend. `npm test` resta senza database | Un loop rotto deve dare un check rosso distinto, e i 79 unit test devono restare veloci ed eseguibili senza Docker |
| 2026-09-08 | **Drift noto**: le migrazioni in `be/drizzle/` creano gli unique come indici e tre indici su `exercise_catalog` che lo schema Drizzle non dichiara. Per l'unicità è equivalente, ma un `db:push` in locale **cancella** quegli indici di ricerca | Emerso preparando P0e; da sanare con una migrazione dedicata, non dentro un chunk di test |
| 2026-09-08 | L'API resta un **contratto in inglese**: la copy italiana degli errori vive nel client. Sul mobile la mappa sta in `ApiError.messageFrom(err, fallback)`, stesso nome dello statico web | Lo stesso backend serve pannello coach web e app atleta; localizzare nell'API significherebbe tradurre tutto e legare il contratto a una lingua |
| 2026-09-08 | Assegnare un ciclo che parte in futuro **non revoca** più quello attivo: la scheda in corso viene troncata al giorno prima dell'inizio del nuovo (`planAssignmentCutover`), la nuova subentra da sola. Sostituzione immediata (`startsAt <= oggi`) continua a revocare; una sola scheda in coda | Smoke del loop: pianificare il ciclo successivo revocava l'attiva, lasciando il cliente pagante senza scheda (`409 Workout is inactive`) fino alla data di inizio |
| 2026-09-08 | Roadmap 90g = P0–P3 sul loop a pagamento (first-run + smoke, alert actionable, revisioni scheda, nota sessione). NON-goals: DS/Storybook come obiettivo prodotto, nutrition, video library, white-label, multi-coach, billing UI, `packages/shared` big-bang | Ship the paid loop, not feature parity. Invite/assign/log e alert analytics **già esistono**; i gap sono first-run, feed activity, smoke CI, CTA sugli alert, edit mid-ciclo sicuro |
| 2026-09-08 | P2 edit mid-ciclo = **revisioni scheda** (non freeze-delete, non snapshot JSON sessione). Freeze v1, clone v2 (`copyWorkoutTree`), stesso assignment (retarget `workoutId`, no revoke), cutover immediato, lineage esercizio copiato nel clone; PUT in-place vietato se il programma ha sessioni | Oggi PUT sovrascrive il documento da cui recap/analytics leggono; delete esercizio → CASCADE sui `logged_sets`. Recap vecchio rilegge v1 congelato; progressioni restano una curva |
| 2026-09-05 | D3 `useQuery` / `useMutation` in-house (no cache): `queryKey` = deps; `throwOnError` default true; `onError` only if we do not throw | Stessa policy D2 senza copiare `useEffect`+`cancelled`; TanStack come modello di API, non come dipendenza finché non serve invalidate/cache |
| 2026-09-05 | `useCallback` / `useMemo` solo se un figlio `memo()` o un array di dipendenze serve identità stabile | Wrappare handler/valori di default (retry, parse query) non memoizza niente e rumoreggia i hook |
| 2026-09-05 | D2 PageError una volta sola: GET di pagina throw `ApiError` → `ErrorBoundary` (messaggio solo per `ApiError`); sezioni toast; 404 resta not-found. Niente `PageError` nelle pagine | Dipingere l’errore in ogni pagina (come nel commit tagliato) duplica UI e confonde empty vs crash; `error.message` grezzo espone i TypeError di render |
| 2026-09-03 | Recipe DS su primitive flatten: `Button` / `ButtonIcon` / `Input` / `Card` compongono i rispettivi `*Base` (tag nativo); parti (`ButtonLabel`, `InputLabel`, `InputError`, …) private; niente addon Input in questo giro | Call site semplici (`<Input label error />`, `<Button>`, `<Card title meta />`); escape hatch `*Base` per casi avanzati; Storybook cataloga le recipe |
| 2026-08-30 | Primitive DS senza React context: file fratelli (`ButtonBase`, `InputBase`, `CardBase` + pezzi), props esplicite e cascade CSS al posto di provider/registration; niente throw "must be used within Root" | Il context di Button portava in giro solo l'errore; gli id a11y di Input sono più chiari espliciti; meno indirezione, stesso catalogo Storybook |
| 2026-08-29 | D1 design system web: single token source `fe/src/styles/tokens.css` (color/space/radius/type/shadow/motion/z); Storybook 10 (`@storybook/react-vite` + addon-a11y) as the living catalog inside `fe/`; `PageHeader` promoted to `components/`, `CoachCard` as coach-domain pattern in `pages/coach/coachCard/` | Semantic tokens à la Primer/Polaris without a separate ui package; catalog next to components keeps the DS honest; no Style Dictionary / token sharing with RN until mobile actually needs it |
| 2026-08-25 | Catalog search is bilingual (IT primary + EN secondary). Names come from a glossary + curated overlay at seed (`be/data/exercise-i18n.json`); we do not hand-edit 873 English names. Selecting a catalog row stores the Italian name as `exercises.name`. Movement media is 2-frame 0.jpg/1.jpg flip (`image_url_end`); no videos. | Coaches search `panca` or `bench`; athletes see Italian titles with English subtitle and a start/end photo. Videos (wger / Gym Visual) stay out of scope. |
| 2026-08-24 | Brand accent lime `#c7f464` → powder blue `#bfdbf7` (deep `#4a7fb0`, on-accent `#111111`); charcoal surfaces unchanged | Iterate away from lime/yellow; pale blue reads calmer on the dark coach UI |
| 2026-08-24 | Web `/` has no public landing: anonymous → `/login` (logo + form), authenticated → `/dashboard` | Coach web is a private panel; marketing landing was unused and looked generic |
| 2026-08-24 | Analytics period change keeps previous data under a `BusyRegion` overlay; first load uses a layout skeleton | Avoid collapsing KPI/chart height when switching 4w/12w/52w |
| 2026-08-20 | Drop planned occurrences + adherence; analytics are activity-only (sessions, volume, streak, PR, inactivity / program-expiring alerts) | Coach does not need planned-vs-skipped weekdays; simpler stats, no materialization machine |
| 2026-08-20 | Analytics per ruolo su fondazione condivisa: Progressi motivazionali nella tab mobile, segnali operativi e drill-down sul web coach; ~~aderenza solo da occorrenze pianificate persistite~~ superseded same day by activity-only stats | Separare gli obiettivi atleta/coach mantenendo metriche coerenti |
| 2026-08-02 | Dual-mode atleta: self-register mobile + schede self editabili; coach via codice invite (max 1); programma coach ha priorità (annulla per cambiare); coach vede storico | Acquisizione senza frizione + coach workflow; reverse-pivot controllato dal self-service totale |
| 2026-07-30 | Assignment lifecycle hardening: `workouts.isActive` sincronizzato con status/date assegnazione; gate sessione atleta su assignment attiva; assign da TXT atomico in transazione; migration `0006` elimina programmi legacy self-service atleta e normalizza `is_active` | Evitare schede fantasma attive, sessioni su programmi non assegnati, stati incoerenti post-pivot coach |
| 2026-07-30 | Import TXT: weekday per giorno = ordine sequenziale (Giorno 1 → Lun, Giorno 2 → Mar, …) se non specificati nel testo | Allineare parser AI/TXT al calendario settimanale senza chiedere weekday espliciti |
| 2026-07-30 | Web atleta (`fe/src/pages/home`, `sessions`, `stats`, …) **non routato**; solo coach + landing/auth; builder `workouts/new` riusato dal coach | Athlete UX solo su mobile; ridurre superficie web morta in attesa di cleanup PR |
| 2026-07-28 | Style guide landing HTML: palette `#1D1F25` / `#C7F464` / `#166534` / `#E0E0E0`, font Roboto, landing pubblica su `/`, dashboard coach su `/dashboard` | Unificare brand identity al codice style fornito |
| 2026-07-28 | Import scheda da TXT (incolla) su template e assegnazione da zero; giorni logici numerati; prompt AI copiabile | Velocizzare creazione schede con AI esterna senza UI upload file |
| 2026-07-27 | Web (`fe/`) = **pannello coach**; atleti su **mobile**; schede template + assegnazione con `startsAt`/`expiresAt`; atleta solo logga | Pivot da self-service a coach→clienti; template riutilizzabili o scheda da zero; date di validità sull’assegnazione |
| 2026-07-25 | Mobile start = **picker scheda attiva + giorno**; schede `isActive` (disattiva/riattiva); create/edit con **prescription per serie** (reps + recupero) | Evitare “sempre la scheda più nuova / tutto il ciclo”; più programmi convivono; serie 10→8 e rest diversi senza lasciare il modello BE |
| 2026-07-21 | Mobile path = **Expo React Native** in `mobile/` (TypeScript); Capacitor retired from `fe/` | Native UI/notifications without WebView; separate toolchain from Vite; didactic README in `mobile/` |
| 2026-07-21 | Auth refresh = cookie (web) **and** JSON body when `X-Client: mobile` + SecureStore | RN has no httpOnly cookie jar; keep web unchanged |
| 2026-07-21 | Share Zod/API lazily (copy into `mobile/` first; `packages/shared` later) | Avoid monorepo day-1; extract only when duplication hurts |
| 2026-07-19 | Exercise catalog = **vendored** [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) (~873 exercises), searched via our BE (`GET /api/catalog/exercises`) — not a live third-party call | Compared GitHub/hosted options: **Kinetic** (`api.kinetic.place`, 899 ex) works but public tier ~50 req/day — too low; **wger** has IT translations + public API but network dependency and CC-BY-SA content; **ExerciseDB** free tier is non-commercial. free-exercise-db is public-domain JSON + images on GitHub raw, no API key, offline-capable after seed. English names are fine for gym UX (IT UI copy stays Italian). |
| 2026-07-16 | ~~Mobile path = Capacitor-first inside `fe/` (not RN, PWA later)~~ **superseded 2026-07-21** | Was: reuse web UI; unlock native rest-timer notifications; keep one frontend folder |
| 2026-06-24 | Home page = the "Dashboard" from the Figma reference (TRACCIA app) | The reference's main screen is the dashboard; that is what we build as `/`. |
| 2026-06-24 | Build the home **mobile-first** and fluid (CSS `auto-fit` grids, no JS breakpoints) | One component tree reflows 1→2→3→4 columns; less code, more control. |
| 2026-06-24 | Mobile/tablet nav = `BottomNav`; reuse `Sidebar` on desktop (≥1024px) | Thumb-friendly on phones; sidebar already built and styled. |
| 2026-06-24 | Build the home against **mock data first**, wire to API incrementally | Current DB only has `workouts`/`exercises`; volume/RIR/TUT/streak need new tables later. |
| 2026-06-24 | UI copy in **Italian** to match the reference ("OGGI", "AVVIA WORKOUT", "ULTIMI ALLENAMENTI") | Keep parity with the approved design. |
| 2026-06-24 | Reference design tokens already align with repo (`--bg #16171d`, `--accent` lime, Barlow Condensed) | No token overhaul needed; reuse existing CSS variables. |
| 2026-06-24 | Use Vite dev proxy for `/api` → `http://localhost:3005` (Phase A, Option 1) | Frontend can call relative `/api/...` URLs in dev without CORS; no extra backend middleware. |
| 2026-06-24 | Use Zod in the frontend API layer to encode requests and decode responses (Phase B) | Runtime validation catches backend shape drift early; shared schemas keep request/response types accurate. |
| 2026-06-24 | Use Docker Compose Postgres (`docker-compose.yml`) as the dev database | Already shipped in the repo via `npm run db:up`; keeps the documented workflow intact. |
| 2026-06-24 | `be/.env` uses `postgres:postgres` credentials (not the `user:password` in `.env.example`) | Must match the credentials in `docker-compose.yml` for the API to connect. |
| 2026-06-24 | Use `npm run db:push` to sync schema (no migration files yet) | `be/drizzle/` is empty; Drizzle `push` syncs the schema directly during early development. |
| 2026-06-24 | Update script only refreshes npm deps in `be/` and `fe/` | Docker/system deps and service startup are environment/AGENTS.md concerns, not the startup script. |

---

## What we did

- 2026-10-17 — La waitlist non manda mail a chi si iscrive. Con SMTP parte solo l'avviso a `WAITLIST_NOTIFY_TO`. Il form dice «Sei in lista. Ti avvisiamo quando apre il test.»
- 2026-10-17 — Tolti i placeholder legali dalla landing (contatto privacy, titolare, P.IVA). I dati mancanti sono annotati in `be/src/waitlist/README.md`.
- 2026-10-17 — Waitlist sul backend: modulo `be/src/waitlist/` (`POST /api/waitlist`, migrazione `0013_waitlist_signups`, email Sole via SMTP). Il form della landing manda JSON. Checklist per Railway e Pages in `be/src/waitlist/README.md`.
- 2026-10-17 — Landing whitelist: pacchetto `landing/` (Astro, tema Sole, Plus Jakarta Sans in locale). Job CI `Landing` (`check` + `build`). Il workflow Pages mette `fe/dist` alla radice dell'artifact e `landing/dist` in `site/landing/`. Form con consenso GDPR, honeypot e `?ref=`.
- 2026-10-17 — M4 design "Sole": token chiari e Plus Jakarta Sans su mobile (`colors.ts`, `fontFamilies`, `AppText` sceglie il file per peso) e web (`tokens.css`); `scripts/check-contrast.mjs` (42 coppie, job CI `Contrast`). Mobile: Home su `GET /athlete/home` con card arancio e bottom sheet "Cambia allenamento", Progressi con card indaco, Allenamento una serie alla volta ("Tutte le serie" in bottom sheet, RIR di W9 incluso), fine allenamento arancio, Schede con "In uso" e badge, Account a righe con sotto-route `settings/coach|profile|password`. Web: primitive a pill, sidebar bianca con voce attiva ink, KPI e stati scheda nei colori Sole, grafici indaco con la settimana in corso arancio. Branch impilati su W9 (#82) e su `refactor/fe-style-debt` (#80).
- 2026-10-16 — W9 RIR in sessione (mobile): terzo stepper "RIR" sotto kg/reps, facoltativo (0–10, − sotto 0 lo svuota), precompilato con il RIR prescritto per la serie; colonna RIR nelle tabelle serie e nel "Modifica serie". Salvato nel log offline e inviato con la chiusura.
- 2026-10-16 — W9 prescrizione completa: `exercise_sets` + `reps_max`, `load_value` + `load_unit` (`kg` | `percent_1rm`), `rir` (0–10); `exercises.notes` (max 500). Tutti facoltativi, migrazione `0012`. Builder web: colonne Fino a / Carico / RIR e campo note; TXT `8-12@90`, `Carico:`, `RIR:`/`RPE:` (RPE convertito in RIR), `Note:`. Mobile: obiettivo della serie e note in sessione, peso precompilato dal carico in kg se non c'è storico, builder mobile che conserva i campi al salvataggio.
- 2026-10-16 — Track O (logging offline): O1 `PUT`/`DELETE` serie per esercizio + numero (#61); O2 chiusura ripetibile e `completedAt` dal telefono (#62, #63); O3 avvio app senza rete con l'utente salvato in SecureStore (#64); O4 timeout 8 s sulle scritture + errori in italiano (#65); O5 schermata sessione apribile da `bundle.json` (#66); O6/O7 diario della sessione ridotto a fotografia (#68, #71); O7a `loggedAt` per serie nella chiusura (#69); O7b invio della chiusura con attese crescenti (#72); O8 schermata, fine sessione e Home offline (#73). Regole di stile in [`docs/guidelines/code-style.md`](docs/guidelines/code-style.md) (#67, #70). Prova su telefono: checklist in [`mobile/README.md`](mobile/README.md#prova-offline).
- 2026-10-07 — Countdown recupero nativo su Android: modulo Expo locale `mobile/modules/rest-timer-notification` (Kotlin, `NotificationCompat`) con cronometro di sistema (`setChronometerCountDown`), auto-chiusura a fine recupero (`setTimeoutAfter`), Live Update su Android 16 (`setRequestPromotedOngoing` + `POST_PROMOTED_NOTIFICATIONS`). Sostituisce la notifica `expo-notifications` "Recupero in corso". "Salta" apre `traccia://session/<id>?rest=skip`; cancel annulla anche le notifiche di fine programmate per la sessione (sopravvive al kill dell'app).
- 2026-10-05 — Timer recupero più nativo: su iOS Live Activity (`expo-widgets` + `@expo/ui`, `RestTimerActivity.ios.tsx`) con countdown di sistema su lock screen e Dynamic Island al posto della notifica "Recupero in corso"; notifica di fine `timeSensitive`; permesso chiesto una volta all'apertura sessione; niente banner in primo piano se la sessione è aperta; tap sulla notifica → `/session/<id>`; pulsante "Salta" sulla notifica Android. Limite noto: se il recupero finisce ad app sospesa la Live Activity resta su 0:00 fino alla riapertura. Serve un nuovo dev build iOS.
- 2026-10-03/04 — M3b UI foundation mobile: `GlassTabBar` custom (Tabs JS + `tabBar` prop + `expo-blur`) — pill flottante stile Telegram identica al mockup su Android/iOS/web, con badge "scheda nuova" cablato alla prop `hasUnseenAssignment` (dati reali in M3d); `Mascot` (4 lottie: wave/waiting/sleeping/notebook, crediti in `mobile/assets/lottie/CREDITS.md`), `EmptyState` stile Telegram e `BottomSheet` animato in `src/components/`; `lottie-react-native` + `@lottiefiles/dotlottie-react` per il web. Prima scelta `NativeTabs` scartata: la barra di sistema non può fare la pill flottante del mockup (resta attaccata al bordo).
- 2026-09-28 — M2 chunk 1 builder scheda mobile: `WorkoutDraft` + `WorkoutBuilder` (panoramica giorni → giorno → sheet esercizio con ricerca catalogo), unico "Salva scheda", recupero a 4 opzioni visibili, weekday unici per giorno validati in bozza, import TXT nella bozza, schede coach in sola lettura; lista schede ricarica al focus. Test: `cd mobile && ../be/node_modules/.bin/tsx --test src/features/workoutprogram/*.test.ts`.
- 2026-09-12 — Activity feed sulla dashboard coach: `GET /coach/dashboard` include `recentActivity` (max 8 sessioni completate), UI “Attività recente” sotto la tabella atleti.
- 2026-09-12 — P0 first-run coach: empty `/clients`, `/assignments`, `/assignments/new` (0 clienti) e `/analytics` puntano a invito/assegnazione; niente “Creane uno” su clienti (resta sui template).
- 2026-09-08 — P0e smoke del loop in CI: job `Smoke` con service Postgres, schema da `db:migrate`, `be/src/e2e/loop.e2e.test.ts` che percorre invite → redeem → assign → sessione → visibilità coach e blinda la regressione di P0b. Il test rifiuta di girare su `workout_planner`. Verificato che fallisce reintroducendo il codice pre-fix.
- 2026-09-08 — P0a errori del loop in italiano: `ApiError.messageFrom` sul mobile traduce le 8 stringhe backend che l'atleta incontra fra redeem e avvio sessione, più rete assente / 401 / 5xx. Convertiti i soli call site del loop (redeem, unlink, avvio sessione, schede); gli altri ~15 restano da fare.
- 2026-09-08 — P0c onboarding coach mobile: `resolveNoProgramReason` separa `no-coach` / `coach-pending` / `coach-program-inactive`, la card vuota della Home cambia copy e bottoni di conseguenza, CTA "COLLEGA COACH" su Home e Schede. La copy di `coach-program-inactive` non può citare le date: nessuna API le espone per un'assegnazione non attiva.
- 2026-09-08 — P0b cutover assegnazioni: `planAssignmentCutover` + `dayBefore` in `assignmentStatus.ts`, `revokeOtherActiveAssignments` → `applyAssignmentCutover` (4 call site passano le date in arrivo). Smoke baseline del loop eseguito su DB reale: invite → redeem → assign → sessione → visibilità coach funziona; trovati errori invite in inglese, dashboard senza activity, `notes` mai scritta.
- 2026-09-08 — Lock roadmap loop vs codice (traccia-feature-plan v1): P0 = first-run + activity dashboard + smoke CI (invite/assign/log già cablati); P1 = CTA su `inactive` / `program_expiring` già in analytics, non un motore nuovo; P2 = revisioni; P3 = `workout_sessions.notes` (colonna già lì). Corretti todo stale: link forgot-password **assente** in login; pagine web atleta già fuori da `App.tsx`.
- 2026-09-05 — D3 in-house `useQuery`/`useMutation` (`@api`): GET feature hook e mutation coach/settings migrati; login/register, catalog search e workout form restano speciali. Niente cache, niente TanStack.
- 2026-09-05 — Catalogo Storybook FE: storie per ogni export pubblico dei componenti condivisi (`ButtonIcon`, `*Base`) e per `CoachCard`/`CoachCardList`; `PageHeader` con autodocs; test di coverage sul catalogo. Parti private (label/error/spinner) restano fuori.
- 2026-09-05 — D2 PageError: primitive + Storybook; un solo call site di produzione (`ErrorBoundary`). GET di pagina throw `ApiError` (builder incluso); il boundary mostra il messaggio solo per `ApiError`. Analytics di sezione toast; 404 not-found. Niente `PageError`/`useCallback` retry nelle pagine.
- 2026-09-03 — D1 recipe layer: `Button`/`ButtonIcon`/`Input`/`Card` sopra `*Base`; parti private; rimossi `InputField`/`InputAddon`/`InputControl`; call site migrati a recipe; Storybook aggiornato.
- 2026-08-30 — D1 flatten primitive DS: Button/Input/Card senza React context né namespace compound (`Button.Root` → `ButtonBase` + fratelli, idem Input/Card); spinner di `loading` posseduto da `ButtonBase` (fix: prima restava invisibile ai call site); styling error/disabled/embedded via selettori discendenti CSS; `htmlFor`/`id` espliciti nei form. Netto vs HEAD dopo staging sibling ≈ −330; ButtonSpinner resta privato.
- 2026-08-29 — D1 design system web: `tokens.css` + refactor token-only dei CSS dei componenti condivisi; Storybook 10 con storie per le 9 primitive + pagina Foundations (`npm run storybook`); `PageHeader` condiviso (legacy `coachpageheader/` eliminato) e `CoachCard`/`CoachCardList` nelle pagine coach. Nota: il commit `82c2169` cita PageError nel messaggio, ma il componente non è entrato nel tree (rimosso prima del commit); le pagine coach restano senza stato di errore dedicato.
- 2026-08-25 — Mobile scheda + sessione: card esercizio con flip 0/1 sopra, titolo IT e inglese. Lista in `workout/[workoutId]`, gesto in alto anche in sessione attiva/recap.
- 2026-08-24 — Drop public landing: `/` redirects to `/login` or `/dashboard`; BrandMark SVG removed; login shows wordmark while session bootstraps.
- 2026-08-24 — Analytics period loading: `BusyRegion` overlay keeps KPI/chart on 4w/12w/52w refetch; skeleton on first load for client detail and `/analytics`.
- 2026-08-20 — Drop adherence/occurrences: migration `0009` drops `workout_occurrences` + `occurrence_id`; analytics activity-only (`athletesActiveInPeriod`, inactivity/expiring alerts); mobile Progressi KPI Sessioni/PR/Serie; coach web KPI atleti attivi / da controllare.
- 2026-08-20 — U4 coach analytics: pagina `/analytics` con filtri 4/12/52 settimane, KPI portafoglio, trend settimanale e clienti da controllare; dashboard con attività/alert; riepilogo analitico nel dettaglio cliente.
- 2026-08-20 — M1 mobile Progressi: tab dedicata con KPI sessioni/PR/serie, trend settimanale, carico registrato, progressioni esercizi e storico paginato; Home resta a 2 KPI.
- 2026-08-20 — B6 analytics foundation: range 4w/12w/52w, e1RM Epley e API atleta/coach autorizzate (occurrences/adherence later dropped).
- 2026-08-05 — U3 coach dashboard density (UX Pilot): KPI 4-col, tabella atleti, task prioritari da scadenze, CTA library template, sidebar coach card; chart scadenze rimosso dalla home coach.
- 2026-08-04 — U2 mobile Active Session density (UX Pilot): header + progress bar, rest bar compatta, tabella set con PRECEDENTE da sessione precedente, pager PRECEDENTE/PROSSIMO, TERMINA rosso.
- 2026-08-04 — U1 mobile Home density (UX Pilot): WeekStrip 7 giorni, TodayCard densità + badge, KPI 2-up da `/stats`, recent con volume; mock HTML in `docs/mocks/uxpilot-home-session/`.
- 2026-08-02 — A3 athlete dual-mode: mobile self-register; invite codes (generate/redeem/unlink, 1 coach); self vs coach program permissions; session priority on active coach assignment (revoke by athlete or coach); mobile create (DIY + AI TXT prompt); coach client detail shows session history.
- 2026-07-30 — Assignment lifecycle: sync `isActive` ↔ assignment status/dates, session start gate per atleta, assign program/TXT in transazione, migration `0006` cleanup programmi legacy; doc `fe/src/pages/ATHLETE_WEB_DEPRECATED.md`.
- 2026-07-30 — Parser TXT: weekday sequenziali Lun→Dom per ordine giorno quando assenti nel testo.
- 2026-07-28 — Style guide landing: token CSS/mobile da HTML brand, pagina `/` pubblica (hero + Accedi/Prova Gratuita), coach home su `/dashboard`, font Roboto.
- 2026-07-28 — Brand Traccia: asset logo in `fe/src/assets/brand` + `mobile/assets/brand`, componente `BrandLogo`, auth web e login/register mobile col logo.
- 2026-07-28 — Import TXT scheda (incolla): parser `parseSchedaTxt`, UI su template create/edit, assegnazione da zero e edit programma cliente; bottone “Copia prompt AI”.
- 2026-07-27 — Coach admin v1: roles `coach`/`athlete`, `coach_athletes`, workout `kind` template/program, `program_assignments` (date + status), API `/api/coach/*` + `/api/assignments/active`, web pivot to coach dashboard/clienti/template/assegnazioni, mobile atleta read-only schede + solo logging.
- 2026-07-25 — Mobile UX: `workouts.is_active` + PATCH; Home picker scheda/giorno; disattiva/riattiva in lista; create/edit con serie variabili + recupero; sessione prefill reps dalla prossima prescription.
- 2026-07-26 — Mobile sessione: one-tap `LOG kg × reps`, edit/undo set locale, TERMINA dominante + abbandona dietro conferma; copy stato in italiano.
- 2026-07-21 — Expo RN `mobile/`: TypeScript + Expo Router, auth SecureStore, API Zod port, screens (login/home/workouts/stats/settings/session + rest timer). Capacitor removed from `fe/`. Docs: `mobile/README.md`.
- 2026-07-21 — BE auth dual delivery: cookie for web + optional `refreshToken` in JSON when `X-Client: mobile`; refresh/logout accept body token.
- 2026-07-19 — B5/W8 exercise catalog: vendored yuhonas/free-exercise-db, `exercise_catalog` + seed, `GET /api/catalog/*`, FE picker in AddExerciseForm with optional `catalogId`.
- 2026-07-17 — CAP2 rest timer nativo: countdown recupero post-set in sessione attiva, `RestTimer` (anello SVG), highlight `ExerciseCard`, Local Notifications + Haptics su Capacitor, fallback web (beep/vibrate), permessi al primo avvio native. *(native path moved to Expo `mobile/` on 2026-07-21)*
- 2026-07-17 — CAP1 Capacitor + mobile polish: scaffold iOS/Android, CORS/`VITE_API_URL`, safe-area/viewport, scroll fix shell, bottom nav 4 tab, layout fluido card sessioni. *(Capacitor retired 2026-07-21)*
- 2026-07-16 — CAP1 Capacitor scaffold: `@capacitor/*` in `fe/`, `capacitor.config.ts`, `ios/` + `android/`, `base: './'` Vite, script `cap:sync`/`cap:ios`/`cap:android`, helper `utils/platform.ts`. *(retired)*
- 2026-07-16 — C11 session history: `GET /sessions/history` paginato, pagina `/session-history`, link da dashboard e Progressi.
- 2026-07-14 — Responsive layout refactor: shared `layout.css` tokens, mobile-first AppShell, `.page-container` utilities, dashboard `@container` grids.
- 2026-07-15 — CI GitHub Actions: workflow su push/PR a `main` (BE typecheck + test, FE build con Node 22).
- 2026-07-15 — C10 WeekStrip polish: tap su un giorno della settimana per cambiare/ripristinare il programma di quel giorno.
- 2026-07-15 — Tech debt: fix FE TypeScript build errors, initial Drizzle migration (`be/drizzle/0000_*`), backend unit tests for stats and Rome schedule helpers.
- 2026-07-15 — C8 WeekStrip schedule: dashboard loads 7-day program via schedule API (Rome TZ), shows workout day or rest per weekday.
- 2026-07-14 — W7 session recap: read-only `/sessions/:id` for completed/abandoned sessions, WorkoutRow links from dashboard and stats.
- 2026-07-14 — C7 analytics page: extended `GET /stats` with `dailyBreakdown`, `totalSessions`, `averageSessionVolumeKg`; `/stats` Progressi page with stat grid, volume/activity charts, recent sessions.
- 2026-07-14 — A2 account settings: `/settings` page (name, read-only email, change password, logout); `PATCH /auth/me`, `PATCH /auth/password`.
- 2026-07-14 — C6c TodayCard schedule: dashboard resolves today's workout day via `getWorkoutScheduleToday`, shows day name + program, starts session with `workoutDayId`.
- 2026-07-14 — B4 program days: `workout_days`, `workout_day_weekdays`, `workout_schedule_overrides`; CRUD days/weekdays, schedule resolve + override (cambio giorno), session `workoutDayId`; migration script for existing workouts → default day; FE Zod + `@api/workoutdays`.
- 2026-07-13 — W3 active workout UI: `/sessions/:sessionId` page, session header, exercise cards, set logging, focus mode AppShell, TodayCard “AVVIA WORKOUT” wired to B2 API.
- 2026-07-13 — B2 session logging: `workout_sessions` + `logged_sets` schema, REST API (start/complete/list sessions, log/patch/delete sets), FE Zod schemas + `@api` client. One `in_progress` session per user; `weight_kg` nullable; RIR/TUT optional.
- 2026-07-07 — C6 wire home to API: `useDashboard` calls `getWorkouts` + `getExercisesByWorkout`, maps to dashboard shape, error banner with retry; stats/duration/volume stay placeholder until B3.
- 2026-06-27 — B1 exercises router + counts: nested `GET/POST /api/workouts/:id/exercises`, `GET /api/exercises/:id`, `exerciseCount` on workout list/detail; FE Zod schemas + `@api` client.
- 2026-06-27 — C5 empty + loading states: `Skeleton` primitive, `useDashboard` hook (mock delay + `?state=` dev toggle), section-level skeletons on TodayCard/StatCard/WorkoutRow, Italian empty copy.
- 2026-06-24 — Rebuilt Home as TRACCIA Figma dashboard (C0–C4): AppShell, TopBar, WeekStrip, TodayCard, StatCard grid, WorkoutRow list. Mock data + Italian copy.
- 2026-06-24 — Added `Card` compound component and API wiring (Phases A–B); kept `@api` client for later C6 integration.
- 2026-06-24 — Set up and verified the dev environment: installed `be/` and `fe/` deps, started Postgres via Docker Compose, applied schema, ran both dev servers, and confirmed the API can create/read a workout. Documented startup caveats in `AGENTS.md`.

---

## Home page — chunked roadmap

Legend: ⬜ todo · 🟡 in progress · ✅ done

### Frontend track

- **C0 — Responsive AppShell + home route** ✅
- **C1 — TopBar + WeekStrip** ✅
- **C2 — TodayCard ("OGGI")** ✅
- **C3 — Stat grid (Volume / Workout / Streak / Record)** ✅
- **C4 — Recent workouts list ("ULTIMI ALLENAMENTI")** ✅
- **C5 — Empty + loading states** ✅
- **C6 — Wire home to real `workouts` API** ✅
- **C6b — Wire dashboard stats + recent sessions** ✅
- **C6c — TodayCard from schedule** ✅
- **W5 — Create program UI (days + weekdays)** ✅
- **W6 — Set prescriptions + edit workout** ✅
- **W9 — Prescrizione completa per serie (range reps, carico kg/%1RM, RIR, note esercizio)** ✅
- **A2 — Account settings** ✅
- **C7 — Analytics (charts) v2** ✅
- **W7 — Session recap (read-only history)** ✅
- **C8 — WeekStrip wired to schedule** ✅
- **C9 — Cambio giorno UI (schedule override)** ✅
- **C10 — WeekStrip schedule polish** ✅
- **C11 — Session history (lista paginata)** ✅
- **M1 — Progressi atleta mobile** ✅
- **M2 — Builder scheda mobile (bozza unica + catalogo)** 🟡 — chunk 1 fatto; chunk 2: riordino esercizi/giorni (frecce), avviso modifiche non salvate
- **M3 — Mobile semplice (redesign app atleta)** 🟡 — piano in `docs/plans/M3-mobile-simple.md`; M3a home + badge backend ✅, M3b fondamenta UI ✅, M3c Home ✅, M3d Schede ✅, M3e Progressi ✅, M3f Account a righe ✅ (tutte in stile Sole, M4 F2); resta M3g (E2E)
- **M4 — Design "Sole" (app atleta + pannello coach)** ✅ — piano in `docs/plans/M4-design-sole.md`; F0–F2 mobile, F4–F5 web, F6 contrasto in CI e screenshot. F3 (tavole web sul canvas) saltata: il pannello è stato fatto direttamente seguendo le linee guida F3; resta da provare su iOS/Android con luce piena
- **U4 — Analytics coach web** ✅
- **D1 — Design system web** ✅
- **D2 — PageError pagine coach** ✅
- **D3 — useQuery / useMutation in-house** ✅

### Backend track

- **B1 — `exercises` router + counts** ✅
- **B2 — Session logging schema + API** ✅
- **B3 — Stats endpoints** ✅
- **B4 — Program days schema + API** ✅ (workout days, weekday schedule, date overrides)
- **B5 — Exercise catalog (search API)** ✅ — vendored free-exercise-db + `GET /api/catalog/*`
- **B6 — Analytics per ruolo (activity-only)** ✅ — occurrences/adherence dropped; sessions/volume/PR/inactivity remain
- **W8 — Exercise picker UI** ✅ — autocomplete in “Aggiungi esercizio” + optional `catalogId`

### Workout builder track

- **W8 — Exercise picker UI** ✅ (see above)

### Paid loop (90 days) — P0–P3

- **P0 — First-run coach + activity dashboard + smoke E2E CI** ⬜ — invite/assign/log already shipped
- **P0.5 — Forgot-password** ⬜ — token table exists; no login link; needs mail
- **P1 — Alert actionable in dashboard** ⬜ — `inactive` / `program_expiring` already in analytics
- **P2 — Program revisions (freeze v1, clone v2, lineage)** ⬜
- **P3 — Session note tied to log** ⬜ — `workout_sessions.notes` column exists

## B5 / W8 — implementation plan (8 PRs)

Merge **in order** (stacked branches). Each PR is one concern.

| # | Branch | Scope | Status |
| --- | --- | --- | --- |
| 1 | `cursor/b5-catalog-decision-docs-11e3` | Decision + roadmap | done |
| 2 | `cursor/b5-vendor-exercise-db-11e3` | Slim JSON under `be/data/` | done |
| 3 | `cursor/b5-catalog-schema-11e3` | `exercise_catalog` + migration | done |
| 4 | `cursor/b5-catalog-seed-11e3` | `npm run db:seed-catalog` | done |
| 5 | `cursor/b5-catalog-search-api-11e3` | Search / detail / facets + tests | done |
| 6 | `cursor/b5-catalog-fe-client-11e3` | FE Zod + `@api` client | done |
| 7 | `cursor/w8-exercise-picker-11e3` | Picker UI | done |
| 8 | `cursor/w8-wire-add-exercise-11e3` | Wire form + `catalogId` | done |

**API shape:**
- `GET /api/catalog/exercises?q=&muscle=&equipment=&level=&limit=&offset=`
- `GET /api/catalog/exercises/:id`
- `GET /api/catalog/facets`

**Setup after merge:** `cd be && npm run db:migrate && npm run db:seed-catalog`

**Out of scope:** live wger proxy, video demos, translating historical `exercises.name` rows, user-owned custom catalog rows.

## Other next steps

Order: P0 → P0.5 → P1 → P2 → P3. Igiene non blocca P0. Invite / assign / log / alert analytics **già esistono** — non ricostruirli.

### P0 — First-run + smoke del loop (M–L)

- [x] Baseline: smoke **manuale** del loop attuale — eseguito 2026-09-08 su DB reale. Il loop gira end-to-end; rotture trovate: assegnare un ciclo futuro revocava l'attiva (**risolto**, P0b), errori invite in inglese verso l'atleta, dashboard senza activity, redeem solo in Impostazioni.
- [x] First-run coach: empty states + CTA invite/assign dopo signup; copy clienti non deve puntare a create 410.
- [ ] Invite → redeem visibile: **fatto** (P0c, CTA "COLLEGA COACH" su Home e Schede → sezione COACH di Impostazioni; Home distingue nessun coach / coach senza scheda / scheda coach non attiva). Errori in italiano: **fatto** (P0a). Resta l'hardening invalido / doppio / già collegato. Niente expiry codice (solo rotate) in questo giro.
- [x] Activity feed sulla dashboard coach (chi / cosa / quando). Storico cliente e `/analytics` ci sono già; la home no.
- [ ] Smoke E2E **automatizzato** del loop in CI (first-run → invite → redeem → assign → log → visibilità coach). Sostituisce il todo “smoke solo manuale” come gate.
- [ ] (Cheap) leftover web atleta: `fe/src/api/sessions.ts`, alias/docs. Pagine `home/` / `sessions/` / `stats/` **già** fuori da `App.tsx` — non è un deliverable cartelle da cancellare.

### P0.5 — Forgot-password (S–M, non blocca lo smoke)

- [ ] Route + flusso reset. Tabella `password_reset_tokens` e `RESET_LINK_BASE` ci sono; **il link in login non c’è**; manca mail. Messaggio non-enumerating su email sconosciuta.

### P1 — Alert actionable (S–M)

- [ ] `inactive` (≥7g o mai) e `program_expiring` (≤7g) già in `buildCoachAlerts` + tabella `/analytics` + KPI “Da controllare”. Dashboard: lista in-app con atleta + motivo + CTA (apri atleta / rinnovo), non solo count. Email skip (nessuna infra mail). **Assorbito da R5** del track PT (inbox Oggi).

### PT — Registro pagamenti, Oggi e Business (R1–R8)

Piano: [`docs/plans/PT-registro.md`](docs/plans/PT-registro.md). Telefono e nomi decisi. Mockup PT allineati a M4 (2026-10-26).

- [x] R1 Schema + logica pura (avanzare la data, stato abbonamento). Migrazione `0014_pt_registro`: drizzle ricreava `waitlist_signups` perché `0013` non ha snapshot, blocco tolto a mano dall'SQL; lo snapshot `0014` ora è allineato
- [x] R2 API listino, abbonamento, pagamenti, pausa + smoke. Contratto [`docs/contracts/pt-registro.md`](docs/contracts/pt-registro.md), migrazione `0015_pt_registro_undo`, e2e `be/src/e2e/registro.e2e.test.ts` su `smoke_test`
- [x] R3 Pannello: listino (`/settings/offers`), tab Abbonamento (`/clients/:id/subscription`) con crea/modifica/chiudi/riprendi, Registra pagamento con anteprima e avviso pausa, pausa con anteprima calcolata nel client, storico con annulla. Solo `fe/`, contratto R2 invariato
- [x] R4 Pannello: Clienti con stato, pagato fino al, frequenza ultimi 14 giorni e filtri `?stato=`. Contratto [`docs/contracts/pt-clienti.md`](docs/contracts/pt-clienti.md) (additivo, solo `be/` e `fe/`), e2e `be/src/e2e/clienti.e2e.test.ts` su `smoke_test`
- [ ] R5 Rischio abbandono + Oggi al posto della dashboard
- [ ] R6 Mobile: stato coaching in Home e Account
- [ ] R7 Testi e pulsanti WhatsApp
- [ ] R8 Business

### P2 — Revisioni scheda mid-ciclo (L)

- [ ] Caso offline (track O): se il coach toglie un esercizio mentre l'atleta si allena offline, la chiusura riceve 400 "Exercise does not belong to this workout" → conflitto e **nessuna** serie salvata. Oggi inoltre salvare la scheda togliendo un esercizio cancella a cascata le serie già loggate (`be/src/services/workoutProgram.ts`). Il modello v1/v2 qui sotto risolve entrambi.
- [ ] Pubblica modifica: congela v1, clona v2 (`copyWorkoutTree` + lineage esercizio), stesso assignment retarget `workoutId` (no revoke), v1 `isActive: false` non cancellata. Cutover immediato; sessione aperta finisce su v1. Progressioni/PR raggruppano per lineage. PUT in-place vietato se ci sono sessioni. Badge “scheda aggiornata il …”. Solo programma assegnato, non il template coach.

### P3 — Nota sessione (M)

- [ ] Wire `workout_sessions.notes` (colonna + Zod GET già lì) su PATCH e UI contestuale coach↔atleta. Testo breve, niente thread/allegati.

### O — Logging offline: seguiti

- [ ] Sessioni `in_progress` lasciate aperte per sempre (telefono perso): abbandono automatico dopo N ore? (domanda aperta 2)
- [ ] Track N7 (Android nativo) da allineare alla chiusura con le serie e `loggedAt` (domanda aperta 4).
- [ ] Prova offline su emulatore: le build release bloccano HTTP verso il backend locale; serve un manifest release con cleartext (cartella `android/` generata) o un tunnel HTTPS.

### N — App Android nativa

- [ ] N1–N12: vedi [`docs/plans/android-native.md`](docs/plans/android-native.md) (tabella "PR e dipendenze" = stato).

### Igiene / later (non fase prodotto)

- [ ] Test FE puntuali (Vitest mapper/utils) dove si tocca il loop — non gate di mercato.
- [ ] (Later) Optional user custom exercises on top of B5; videos remain out of scope.
- [ ] (Later) Mobile: polish restante atleta vs mock (override DayPicker su WeekStrip, empty states).
- [ ] (Later) Extract `packages/shared` only if it unblocks P0–P2.
