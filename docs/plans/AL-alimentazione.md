# AL — Alimentazione (piano pasti): piano di esecuzione

Stato: proposta, da approvare. Data: 2026-11-12. Sostituisce come piano di esecuzione la prima versione `claude/D-alimentazione.md`, che resta come riferimento. Rispetto a quella versione cambiano: nomi delle tabelle (`meal_plans`… al posto di `nutrition_plans`…), piano attivo con `is_active` al posto di `endedOn`, route `/meal-plan` al posto di `/nutrition-plan`, registrazione ammessa solo per oggi e ieri, cancellazione a cascata allo scollegamento. Sono tutte proposte da confermare (sezione 11).
Sigla **AL** (AL0–AL7), confermata dall'utente il 2026-11-13 ("D" è già usata da `feat/D1-design-system`). Confermati lo stesso giorno anche i nomi delle tabelle (`meal_plans`, `meal_plan_meals`, `meal_plan_items`, `meal_logs`) e la cancellazione a cascata di piano e registrazioni allo scollegamento (H8, "per ora").

## 1. Decisioni già prese dall'utente
- Proposta **A · Piano pasti**: il coach prepara un piano pasti dal pannello; l'atleta lo segue un pasto alla volta: "Adesso tocca a", "Segna come fatto", "Ho mangiato altro".
- App: switch **Allenamento / Alimentazione** in alto nella Home, pill chiara, centrata e compatta, **nascosto** se il modulo non è attivo. In modalità Alimentazione la tab bar diventa **Oggi, Piano pasti, Progressi, Account**; colore del modulo indaco (`colors.data` `#3B3F9E`, `colors.dataBg` `#E6E7FA` in `mobile/src/theme/colors.ts`).
- Pannello: tab **Alimentazione** nel dettaglio cliente, accanto ad Abbonamento, route proposta `/clients/:id/nutrition`.
- Lessico: sempre "Alimentazione" o "Pasti", **mai "Dieta"** (la prescrizione di diete è riservata a professionisti abilitati; il PT dà solo indicazioni generali).

## 2. Ipotesi (default NON confermati)
H1 modulo attivo = il cliente ha un piano pasti attivo · H2 un solo piano giornaliero (uguale tutti i giorni) · H3 quantità come testo libero, niente calorie né macro · H4 PDF del nutrizionista fuori dalla v1 · H5 solo atleti con coach · H6 segnare un pasto richiede rete in v1, scrittura idempotente · H7 si può segnare oggi e ieri (giorno di Roma) · H8 scollegamento = piano e registrazioni cancellati a cascata · H9 l'app ricorda l'ultima modalità scelta.

## 3. Cose da sapere dal repo (verificate il 2026-11-12)
- Il WORKBOOK del 2026-09-08 elenca "nutrition" tra i non-goal: serve una voce di decisione nuova che lo superi (AL0).
- La CI (`.github/workflows/ci.yml`) parte solo su push e PR verso `main`: le PR verso `main-diet` oggi non hanno controlli (AL0).
- Il migratore Drizzle applica solo migrazioni con `when` più recente dell'ultima applicata: regola di rigenerazione nella sezione 9.
- `GlassTabBar` disegna tutte le `state.routes`: per nascondere una tab va modificato (sezione 8).
- Il pannello e il mobile validano gli enum con `z.enum` chiuso: gli enum di AL vanno letti con una via di fuga.
- Il mobile ha già `expo-secure-store` ed `expo-file-system`; nessun AsyncStorage.

## 4. Modello dati (implementato in AL1; fonte unica: lo schema)
Fonte di verità: `be/src/db/schema/meallogs.ts`, `mealplans.ts`, `mealplanmeals.ts`, `mealplanitems.ts` e la migrazione AL (una sola, sezione 9). Qui solo le scelte che spiegano la forma; i dettagli non si ricopiano.
| Tabella | Scelte |
|---|---|
| `meal_plans` | un piano per coppia (unique `(coach_id, athlete_id)`, H2); FK composta su `coach_athletes(coach_id, athlete_id)` on delete cascade (H8), come `coach_inbox_handled`; unique `(id, athlete_id)` come bersaglio della FK composta di `meal_logs`; indice su `athlete_id` |
| `meal_plan_meals` | ordine per `position`; `time_of_day` testo `HH:MM` con CHECK sul formato; indice su `meal_plan_id` |
| `meal_plan_items` | `food` + `quantity` testo libero (H3); indice su `meal_id` |
| `meal_logs` | FK composta `(meal_plan_id, athlete_id)` → `meal_plans(id, athlete_id)` on delete cascade: l'atleta del log è per forza quello del piano, e **nessuna FK verso `users`**; `meal_id` FK **set null** e `meal_name` copiato, così modificare il piano non cancella lo storico (P2); unique `(athlete_id, date, meal_id)` → scrittura idempotente (i `meal_id` NULL dei pasti tolti non si scontrano); indici su `(meal_plan_id, date)` e su `meal_id`; CHECK su `status` (`done`, `other`) |
Migrazione: `00NN_al_meal_plans`, dove NN è il numero successivo all'ultima migrazione di `main` (sezione 9). I limiti (12 pasti, 30 voci per pasto, 60 / 120 / 60 caratteri per nome del pasto, alimento, quantità, 1000 / 500 per note del piano e del pasto, 280 per la nota di una registrazione, intervallo di 31 giorni) sono tetti di sicurezza fissati in AL2: la tabella **Limiti** del contratto è l'unica fonte.

## 5. Contratto (implementato in AL2 per il coach; fonte unica: `docs/contracts/al-piano-pasti.md`)
Il contratto contiene tipi, errori, ordine dei controlli, regole del PUT, 413 sui body oltre 100 kB (limite del parser JSON globale) e la parte atleta marcata AL4. Qui la mappa delle route e le scelte che il contratto non spiega:
- **Coach** (`requireRole("coach")`; coppia non collegata → 404 `"Client not found"` via `findClientAthleteId`): `GET | PUT | PATCH /coach/clients/:athleteId/meal-plan`; `GET /coach/clients/:athleteId/meal-logs?from=&to=` (max 31 giorni), che per ogni giorno dà `mealCount`, `doneCount`, `otherCount` e `removedCount` (registrazioni di pasti non più nel piano).
- **Atleta** (AL4, `requireRole("athlete")`; si riscrive al Contract Gate di AL4): `GET /athlete/home` additivo con `nutrition` (`null` = switch nascosto); `GET /athlete/meal-plan/today` (con `nextMealId`: primo pasto in ordine senza registrazione per la data); `PUT` e `DELETE /athlete/meal-logs` (idempotenti, data oggi o ieri, H7); `GET /athlete/meal-logs?from=&to=` per Progressi.
- Il PUT sostituisce l'intero piano: id presente = aggiorna, assente = crea, id non inviato = rimosso (i log tengono `meal_name`).
- Tutti i cambi a `/athlete/home` sono additivi; nel mobile `status` e gli enum si leggono con una via di fuga per i valori nuovi.
- Nomi delle route (alt.: `/nutrition`, `/meals`). Il pannello usa `/clients/:id/nutrition` come deciso, anche se l'API usa `meal-plan`: da confermare.

## 6. PR (in ordine)
| PR | Branch proposto | Base → PR | Contenuto | Dipende | Livello |
|---|---|---|---|---|---|
| **AL0** | `chore/AL0-diet-branch-setup` | `main` → `main` | `ci.yml`: aggiunge `main-diet` a push e pull_request; voce WORKBOOK "Alimentazione supera il non-goal nutrition del 2026-09-08"; poi pubblicazione di `main-diet` (`git push -u origin main-diet`, con approvazione) e primo allineamento | — | Deep (CI) |
| **AL1** | `feat/AL1-meal-plan-schema` | `main-diet` | Schema + migrazione + logica pura (prossimo pasto, giorni ammessi, conteggi aderenza) con unit test | AL0 | Deep |
| **AL2** | `feat/AL2-meal-plan-api` | `main-diet` | API coach + contratto `al-piano-pasti.md` + e2e `be/src/e2e/mealplan.e2e.test.ts` | AL1 | Deep |
| **AL3** | `feat/AL3-meal-plan-panel` | `main-diet` | Pannello: tab Alimentazione `/clients/:id/nutrition`, editor dei pasti, attiva/disattiva, ultimi 7 giorni | AL2 | Deep (consuma un contratto nuovo) |
| **AL4** | `feat/AL4-meal-plan-athlete-api` | `main-diet` | API atleta + `nutrition` in `/athlete/home` + e2e | AL2, **R6 confluito in `main-diet`** | Deep |
| **AL5** | `feat/AL5-mobile-mode-switch` | `main-diet` | Switch, tab bar per modalità (opzione A), `GlassTabBar` con route nascoste e colore indaco | AL4 | Standard |
| **AL6** | `feat/AL6-mobile-meals` | `main-diet` | Schermate Oggi ("Adesso tocca a", "Segna come fatto", "Ho mangiato altro") e Piano pasti | AL5 | Standard |
| **AL7** | `feat/AL7-mobile-meal-progress` + PR finale | `main-diet` → poi `main-diet` → `main` | Progressi in modalità Alimentazione (ultimi 14 giorni); WORKBOOK; rigenerazione finale della migrazione; PR di integrazione | AL6 | Deep (integrazione) |
Fuori v1: **AL8** riga "segue poco il piano" in Oggi del coach (nuovo `kind` di avviso; richiede prima il parsing tollerante del pannello, proposto in R7), PDF del nutrizionista, calorie e macro, offline.
In parallelo: AL3 ∥ AL4 dopo AL2 (cartelle disgiunte `fe/` vs `be/`); AL5 può iniziare con dati finti solo dopo che lo schema di AL4 è approvato al Contract Gate.

### AL1 — Schema e logica pura
File: *nuovi* `be/src/db/schema/mealplans.ts`, `mealplanmeals.ts`, `mealplanitems.ts`, `meallogs.ts` (stile dei nomi esistenti, es. `clientsubscriptions.ts`), `be/src/db/schema/index.ts`, `be/drizzle/00NN_*.sql` + snapshot + `_journal.json`, *nuovo* `be/src/services/mealPlan.ts` + `mealPlan.test.ts` (alt.: `nutrition.ts`).
Task: T1 product-analyst (AC, casi limite: pasto rimosso dopo essere stato segnato, piano disattivato a metà giornata) → T2 software-architect (modello, nomi) → Gate → T3 database-engineer (migrazione additiva, rollback provato, da zero su `smoke_test`) → T4 backend-engineer (logica pura) → T6 qa → T7 review.
AC: 1) migrazione da zero su `smoke_test` ricreato + `drizzle-kit check` verdi; 2) unique `(coach_id, athlete_id)` sul piano; 3) unique `(athlete_id, date, meal_id)` sui log; 4) cancellare un pasto lascia i log con `meal_id` null e `meal_name`; 5) scollegare la coppia cancella piano e log (H8); 6) `nextMealId` corretto con 0, alcuni o tutti i pasti segnati; 7) giorno ammesso = oggi o ieri di Roma, anche a cavallo della mezzanotte e del cambio d'ora.
Check Deep: be `tsc`, `npm test`, migrazioni da zero, `drizzle-kit check`, security-engineer sulle FK.

### AL2 — API coach
File: *nuovi* `be/src/routes/coachmealplan.ts`, `be/src/services/mealPlanValidation.ts` (+ test), `be/src/services/mealPlanAccess.ts`, `be/src/routes/coach.ts` (mount), `be/src/e2e/mealplan.e2e.test.ts`, `docs/contracts/al-piano-pasti.md`. Riusa `findClientAthleteId` da `be/src/routes/coachsubscriptions.ts` (id valido + coppia collegata, altrimenti 400 / 404).
Task: T2 architect (contratto completo, errori, limiti) → **Contract Gate con approvazione utente** → T4 backend → T6 qa + security → T7 review.
AC: 1) GET senza piano → `{ mealPlan: null }`; 2) il primo PUT crea (201, attivo), i successivi aggiornano (200); 3) gli id inviati si conservano, quelli non inviati si rimuovono; 4) un id di pasto di un altro piano → 404; 5) PATCH `isActive` funziona ed è idempotente; 6) un atleta non collegato → 404 `"Client not found"`; 7) superare i limiti → 400; 8) meal-logs oltre 31 giorni → 400; 9) un coach non vede i piani di un altro coach.
Check Deep + e2e su `smoke_test`.

### AL3 — Pannello, tab Alimentazione
File: `fe/src/pages/coach/clients/detail/clientTabs/ClientTabs.tsx` (terza voce "Alimentazione"; **solo AL tocca questo file**), `fe/src/App.tsx` (`/clients/:id/nutrition` prima di `/clients/:id`), *nuova* `fe/src/pages/coach/clients/detail/nutrition/` (index, editor dei pasti, riga di aderenza, mappers + test, sul modello di `detail/subscription/`), *nuovi* `fe/src/api/schemas/mealPlan.ts` + `fe/src/api/mealPlan.ts`, `fe/src/api/schemas/index.ts`, `fe/src/api/knownErrorMessages.ts`. Usa `useUnsavedChangesGuard` (`fe/src/utils/`).
Task: T1 product + ui-ux-designer (Sole: indaco per i dati, nessun numero inventato nelle storie) → T5 frontend → T6 qa (prova nel browser, desktop e 375px) → T7 review.
AC: 1) tab visibile per ogni cliente, attiva su `/clients/:id/nutrition`; 2) empty state "Nessun piano pasti" con il pulsante "Crea piano pasti"; 3) aggiungere, togliere e riordinare pasti e voci; 4) le modifiche non salvate chiedono conferma all'uscita; 5) attiva/disattiva; 6) ultimi 7 giorni con fatti e altro per giorno; 7) **grep `-i "dieta"` su `fe/src` per le copy del modulo = 0 risultati**; 8) una riga di nota "indicazioni generali" (se confermata); 9) storie Storybook senza numeri inventati.
Check Deep (lint, `tsc -b`, test, build, `build-storybook`, `check-contrast`, confronto contratto BE ↔ `fe/src/api/schemas`).

### AL4 — API atleta
Prerequisito: R6 confluito in `main` e allineato in `main-diet` (sezione 9).
File: `be/src/routes/athlete.ts` (route nuove; alt.: *nuovo* `be/src/routes/athletemealplan.ts` montato sotto `/athlete`), `be/src/services/athleteHome.ts` (una riga per `nutrition`), *nuovo* `be/src/services/athleteNutrition.ts` (alt.: dentro `mealPlanAccess.ts`), e2e esteso, `docs/contracts/al-piano-pasti.md`.
AC: 1) `nutrition: null` senza piano attivo o senza coach; 2) `GET /athlete/meal-plan/today` con il log di ogni pasto e `nextMealId`; 3) due PUT uguali → stesso risultato, una sola riga; 4) DELETE due volte → 204; 5) data diversa da oggi o ieri → 400; 6) un pasto di un piano non attivo o di un altro atleta → 404; 7) `coaching` (R6) e `nutrition` convivono in `/athlete/home` senza toccarsi; 8) il mobile già pubblicato continua a funzionare.
Check Deep + confronto contratto BE ↔ `mobile/src/api`.

### AL5 — Switch e tab bar per modalità (mobile)
File (opzione A): `mobile/app/(app)/_layout.tsx` (provider della modalità, `href: null` per modalità, titolo "Home"/"Oggi"), *nuovo* `mobile/app/(app)/meals.tsx` (alt.: `meal-plan.tsx`, `nutrition.tsx`), `mobile/app/(app)/index.tsx` (Home o Oggi alimentazione secondo la modalità), `mobile/src/components/glasstabbar/GlassTabBar.tsx` (salta le route nascoste; colore della pill attiva per modalità), *nuovi* `mobile/src/features/nutrition/` (alt.: `meals/`) con `modeswitch/ModeSwitch.tsx` e il contesto della modalità (nomi da confermare: `AppModeProvider` / `useAppMode`), `mobile/src/api/schemas/athletehome.ts` (`nutrition`), `mobile/src/features/home/homescreen/HomeScreen.tsx` (switch nell'header: una riga).
AC: 1) switch nascosto con `nutrition: null`; 2) switch visibile e centrato, pill chiara compatta; 3) in Alimentazione la tab bar mostra esattamente Oggi, Piano pasti, Progressi, Account; in Allenamento Home, Schede, Progressi, Account; 4) pill attiva indaco in Alimentazione, contrasto verificato; 5) se il coach disattiva il piano, l'app torna da sola in Allenamento; 6) un link diretto a `/workouts` in modalità Alimentazione non lascia la tab bar incoerente; 7) il badge "scheda nuova" funziona come prima; 8) la modalità scelta si ricorda (H9).
Check Standard (mobile `typecheck` + `typecheck:test`). **Non verificabile in locale:** l'app sul telefono.

### AL6 — Oggi e Piano pasti (mobile)
File: *nuovi* in `mobile/src/features/nutrition/`: `todaymeal/` ("Adesso tocca a" con "Segna come fatto" e "Ho mangiato altro" + nota facoltativa), `mealplanscreen/`, `useMealPlanToday.ts`, mappers + test; *nuovi* `mobile/src/api/mealPlan.ts` + `mobile/src/api/schemas/mealplan.ts`, `mobile/src/api/index.ts`, `mobile/src/api/schemas/index.ts`. Dopo ogni scrittura va svuotata la cache breve (`responseCache`).
AC: 1) "Adesso tocca a" mostra il primo pasto non segnato; 2) "Segna come fatto" e "Ho mangiato altro" scrivono e passano al pasto successivo; 3) si può annullare l'ultimo segno; 4) senza rete: messaggio d'errore e "Riprova", nessun segno perso in silenzio (H6); 5) tutti i pasti fatti → stato "Giornata completata" (copy da T1); 6) Piano pasti mostra il piano completo in ordine con quantità come testo; 7) nessuna occorrenza di "Dieta" nelle copy del mobile.
Check Standard.

### AL7 — Progressi alimentazione e integrazione in `main`
File: `mobile/app/(app)/stats.tsx` (Progressi secondo la modalità), *nuovo* `mobile/src/features/nutrition/mealprogress/`, `WORKBOOK.md`, rigenerazione della migrazione (sezione 9).
AC: 1) griglia degli ultimi 14 giorni con fatti, altro e saltati; 2) migrazione AL rigenerata dopo l'ultima di `main`, `drizzle-kit check` verde, migrazioni da zero verdi; 3) PR `main-diet` → `main` con CI verde; 4) piano di rilascio scritto: migrazione → BE → pannello → build mobile.
Check Deep (integrazione completa, security-engineer, rilascio e rollback).

## 7. Rilascio e rollback (alla fine)
Migrazione AL in produzione → BE → pannello → build mobile EAS (tutto con approvazione). Fino a quando un coach non crea un piano, `nutrition` è `null` per tutti: il modulo resta invisibile. Il mobile vecchio ignora il campo, ma un atleta con l'app vecchia non vede il piano: nel pannello può servire la nota "l'atleta deve avere l'app aggiornata" (da decidere). Rollback: revert del pannello e del BE; le tabelle nuove restano (additive).

## 8. Expo Router: switch e tab bar per modalità (codice verificato)
Stato attuale: `mobile/app/(app)/_layout.tsx` ha un solo `Tabs` con `index`, `workouts`, `stats`, `settings` e `tabBar={(props) => <GlassTabBar … />}`. `GlassTabBar` scorre **tutte** le `state.routes`. In expo-router 57, `href: null` imposta solo `tabBarItemStyle: {display:'none'}` e un `tabBarButton` vuoto, che `GlassTabBar` non usa.

**Opzione A (consigliata): un solo `Tabs`, route nascoste per modalità**
- Aggiungere la route `meals`. `workouts` ha `href: null` in Alimentazione e `meals` ha `href: null` in Allenamento. `index` mostra Home o Oggi alimentazione e cambia titolo ("Home"/"Oggi"); `stats` mostra Progressi secondo la modalità. La modalità sta in un contesto nel layout, salvata con `expo-secure-store` (già installato).
- `GlassTabBar` salta le route con `tabBarItemStyle.display === 'none'` (o una prop esplicita con le route visibili) e riceve il colore della pill attiva (cacao o indaco).
- Pro: un solo navigatore; Progressi e Account non si duplicano; i link esistenti (`/(app)/settings`, `/(app)/workouts`, `/(app)/settings/coach`) restano validi; diff piccolo; nessun file spostato, quindi nessun conflitto con R6.
- Contro: `GlassTabBar` va modificato; la route nascosta resta nello stato e si raggiunge con un link diretto (serve un controllo); `index` e `stats` fanno due lavori.

**Opzione B: due gruppi `(training)` e `(nutrition)`, ciascuno con il suo `Tabs`, switch con `router.replace`**
- Pro: ogni tab bar è fissa e semplice; separazione netta del codice.
- Contro: Progressi e Account dovrebbero esistere in entrambi i gruppi e risolverebbero allo stesso indirizzo (`/stats`, `/settings`), un conflitto di route in expo-router, da evitare con nomi diversi o un livello in più. Vanno spostati `index.tsx`, `workouts.tsx`, `stats.tsx` e `settings/` dentro `(training)`: un diff grande che entra in conflitto con R6 e con i link già nel codice. Lo switch rimonta tutta la tab bar.

## 9. Allineamento `main` → `main-diet` (procedura concreta)
Quando: dopo ogni PR coach confluita in `main` e prima di aprire una PR AL che tocca file in comune. Ogni passo che scrive (merge, commit, push) solo con l'approvazione dell'utente.
1. `git fetch origin`
2. `git switch main-diet` (working tree pulito; niente stash senza approvazione)
3. `git merge --no-ff origin/main` (**merge, non rebase**: `main-diet` è condiviso)
4. Se `main` ha portato una migrazione nuova e su `main-diet` c'è già quella AL (NN = numero dell'ultima migrazione di `main`, per esempio `0017` per R7), il merge dà un conflitto add/add su `be/drizzle/meta/NN_snapshot.json` (e su `_journal.json`). **Non si cancella lo snapshot NN**: è quello di `main` (con le sue tabelle) e serve a Drizzle come base del `prevId`; toglierlo fa ricreare alla migrazione rigenerata le tabelle di `main`, che applicata da zero fallisce mentre `drizzle-kit check` dice "Everything's fine". Procedura (provata da un revisore in un clone):
   ```
   git checkout origin/main -- be/drizzle/meta/_journal.json be/drizzle/meta/NN_snapshot.json
   git rm be/drizzle/NN_al_meal_plans.sql
   cd be && npm run db:generate -- --name al_meal_plans
   ```
   Risultato atteso: nasce `(NN+1)_al_meal_plans` con lo stesso SQL, `prevId` uguale all'id dello snapshot NN di `main` e `when` più recente. Poi si chiude il merge e si fa un commit separato `chore(be): rigenera la migrazione AL dopo NN`. Verifica: migrazioni applicate da zero su un database vuoto + `drizzle-kit check`.
5. Altri conflitti: `athleteHome.ts` e `HomeScreen.tsx` dovrebbero averne pochi o nessuno (sezione Coerenza); in caso di dubbio si tiene `main` e si riapplica la riga AL.
6. Check: be `tsc --noEmit` + `npm test`; migrazioni da zero su `smoke_test` ricreato + `drizzle-kit check`; fe `lint` + `tsc -b`; mobile `typecheck`.
7. `git push origin main-diet`; i branch AL aperti si aggiornano con un merge da `main-diet`.
8. Database locali che avevano la vecchia migrazione AL: ricrearli (`smoke_test` si ricrea già nel gate Deep).

## 10. Coerenza con il filone COACH (R6–R8)
- Migrazioni: R7 prende `0017` su `main`; quella AL si rigenera dopo ogni allineamento (sezione 9). Motivo: il migratore Drizzle salta senza avvisi le migrazioni con `when` più vecchio dell'ultima applicata (verificato in drizzle-orm 0.45).
- `/athlete/home`: `coaching` (R6) e `nutrition` (AL4) sono campi distinti, ciascuno nel suo file di servizio; AL4 parte solo dopo che R6 è confluito in `main-diet`.
- Pannello: `ClientTabs.tsx` lo tocca solo AL3; R7 non lo tocca. `App.tsx`: righe diverse per R7, R8 e AL3.
- Oggi del coach: "segue poco il piano" = AL8, dopo R7 e dopo che il pannello accetta `kind` sconosciuti.

## 11. Domande per l'utente (con default)
1. ✅ Deciso 2026-11-13: sigla **AL**.
2. Conferma delle ipotesi H1–H7 e H9 (default come scritto). H8 è confermata.
3. ✅ Deciso 2026-11-13: tabelle `meal_plans`, `meal_plan_meals`, `meal_plan_items`, `meal_logs`.
4. Route API: `/meal-plan` (default) / `/nutrition`; route mobile `meals.tsx` (default) / `meal-plan.tsx` / `nutrition.tsx`.
5. Voci del pasto: tabella `meal_plan_items` con cibo e quantità (default) / un solo testo per pasto.
6. ✅ Deciso 2026-11-13: allo scollegamento si cancella tutto (per ora).
7. Progressi alimentazione v1: griglia 14 giorni (default) / Progressi di allenamento anche in modalità Alimentazione.
8. Nota "indicazioni generali" nel pannello: sì (default).
9. Expo Router: opzione A (default) / B.
10. AL0 su `main` (default) / su `main-diet`.
