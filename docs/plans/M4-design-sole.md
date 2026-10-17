# M4 — Design "Sole" (proposta C)

Obiettivo: portare app atleta (mobile) e pannello coach (web) sulla direzione visiva **Sole**: chiara, calda, amichevole e premium. L'app deve restare **semplice**: una sola azione principale per schermata.

Riferimento visivo: canvas Design "traccia — workoutPlanner", riga **Proposta C · Sole** (`PCPalette`, `PCHome`, `PCAllenamento`, `PCProgressi`, `PCFatto`). Per il web, le tavole coach in stile Sole si fanno nella fase F3, prima del codice.

Rapporto con M3: **M3 decide la struttura** (schermate, flussi, tab bar, stati vuoti, `GET /athlete/home`). **M4 decide l'aspetto** (token, font, componenti). M3 non si ferma: i componenti M3 già fatti (`GlassTabBar`, `Mascot`, `EmptyState`, `BottomSheet`) si ritoccano in F1 e le schermate M3 ancora da fare nascono già in stile Sole.

## Decisioni

| Tema | Decisione |
| --- | --- |
| Tema | Solo **chiaro**. Il dark mode resta fuori da M4; i token restano semantici così il dark si potrà aggiungere dopo senza toccare le schermate |
| Font | **Plus Jakarta Sans** (400/500/600/700/800) su web e mobile; sostituisce Roboto (web) e il font di sistema (mobile) |
| Colore principale | Arancio `#FF7A45` **solo come riempimento**. Il testo sopra è sempre cacao `#231A14`, mai bianco (bianco su arancio = 2.9:1, non passa) |
| Testo arancio | Quando serve testo o icona arancio su fondo chiaro: `#A33A12` |
| Dati e grafici | Indaco `#3B3F9E` (ultima barra/periodo corrente in arancio) |
| Copy | Frase normale, niente MAIUSCOLO con tracking (già deciso in M3); italiano |
| Contrasto | Ogni coppia testo/sfondo ≥ 4.5:1, verificata da uno script (F6) |
| Dati mancanti | Nessun numero inventato nei mockup: valori ignoti tra parentesi quadre |

## Token

Nomi semantici: i nomi esistenti restano dove possibile (meno modifiche nelle schermate); i nuovi sono marcati ★.

| Token (mobile `colors.ts` / web `tokens.css`) | Valore | Uso |
| --- | --- | --- |
| `bg` / `--bg` | `#FFF8F1` | sfondo app |
| `surface` / `--surface` | `#FFFFFF` | card, tab bar, input |
| `surfaceElevated` / `--surface-elevated` | `#FFF8F1` | blocchi dentro una card (stepper, righe) |
| `border` / `--border` | `#F0E4D8` | bordi 1px, separatori |
| `textHeading` / `--text-h` | `#231A14` | titoli, testo principale |
| `text` / `--text` | `#6F625A` | testo secondario (5.6:1) |
| `accent` / `--accent` | `#FF7A45` | bottone primario, card "oggi", periodo corrente |
| `onAccent` / `--on-accent` | `#231A14` | testo/icone su arancio |
| `accentBg` / `--accent-bg` | `#FFE7DA` | chip, badge, stepper tenui |
| ★ `accentText` / `--accent-text` | `#A33A12` | testo/icone arancio su chiaro |
| `accentBorder` / `--accent-border` | `#FFC2A6` | bordo selezione |
| ★ `ink` / `--ink` | `#231A14` | bottone scuro (su card arancio), tab attiva, segmented attivo |
| ★ `onInk` / `--on-ink` | `#FFFFFF` | testo su ink |
| ★ `data` / `--data` | `#3B3F9E` | grafici, numeri statistici, card Progressi |
| ★ `dataBg` / `--data-bg` | `#E6E7FA` | chip e card dati |
| `danger` / `--error` | `#B42318` | errori, "in scadenza", Revoca |
| `dangerBg` / `--error-bg` | `#FDE4E1` | sfondo stati di errore |
| `warning` / `--warning` | `#7A5410` su `#FDF1D8` | avvisi |
| `muted` | → rimosso, sostituito da `text` (`#666` non passa il contrasto) |

Forma e profondità:

- Raggi: card 24–32, bottoni e tab **pill** (999), chip 999, input 16.
- Ombra card: `0 1px 2px rgba(35,26,20,.04), 0 10px 28px rgba(35,26,20,.07)`; tab bar più marcata (`0 14px 34px rgba(35,26,20,.12)`).
- Tipografia (mobile, px): display 52/800 · titolo 30/800 · sezione 17/700 · corpo 16/500 · meta 13–14/600. Tracking −2% sopra i 28px.
- Bottone primario: altezza 58–64, pill, `accent` + testo `onAccent` 800.

## Fasi

Una PR per fase (convenzioni in `docs/guidelines/git.md`). F1 e F3 possono partire in parallelo.

### F0 — Decisione e token (piccola)
- Riga in `WORKBOOK.md` (Decisioni) e voce **M4** nella roadmap che rimanda a questo file.
- Script `scripts/check-contrast.mjs` che legge le coppie token e fallisce sotto 4.5:1 (3:1 per testo ≥ 24px).

### F1 — Mobile: fondamenta
- `src/theme/colors.ts`: nuovi valori + token ★; `typography` con `fontFamily` Plus Jakarta Sans per peso.
- Font: `@expo-google-fonts/plus-jakarta-sans` + `useFonts` nel `_layout.tsx` radice (splash finché non caricati).
- Tema chiaro: `app.json` `userInterfaceStyle: "light"`, splash e `android.navigationBar` su `#FFF8F1`, `StatusBar style="dark"`.
- I 11 colori scritti a mano in `src/`/`app/` (overlay `rgba(255,255,255,…)`, `#9a9ea8`, `#ff3b30`…) → token. Gli overlay bianchi pensati per il fondo scuro su crema diventano invisibili: sostituirli con `border`/ombre.
- Componenti in `src/components/`: `AppText` (font, pesi), `button` (pill; varianti primary arancio, ink, soft), `card` (bianco + ombra, niente bordo grigio), `GlassTabBar` (pill bianca; tab attiva = pill ink con icona + etichetta, le altre solo icona), `statcard`, `listrow`, `input`, `bottomsheet`, `emptystate`.
- `Mascot`: le 4 lottie hanno colori nei JSON → ricolorarle (azzurro → cacao/indaco, viso crema) con uno script che riscrive i colori, o con `colorFilters` di `lottie-react-native`. Aggiornare `CREDITS.md` se il file cambia.
- Live Activity iOS del timer (`RestTimerActivity.ios.tsx`) e widget: allineare i colori.
- Check: `npm run typecheck`, giro manuale su iOS e Android (contrasto con luce piena).

### F2 — Mobile: schermate
In ordine di uso: 
1. **Home** (insieme a M3, dati da `GET /athlete/home`): saluto + data, settimana a chip (oggi = ink, giorni con allenamento = bianco + punto arancio), card arancio "Oggi tocca a" con mascotte e bottone ink "Inizia allenamento", link "Cambia allenamento" (bottom sheet M3), due tile (allenamenti della settimana in indaco tenue, ultimo allenamento).
2. **Allenamento — una serie alla volta**: barra a 4 segmenti per gli esercizi + timer; card con esercizio, badge "Serie 2 di 4", "Ultima volta …"; due righe peso/ripetizioni con − / + rotondi da 52px; avviso recupero in indaco; bottone "Serie fatta". La tabella serie diventa secondaria (tap su "Tutte le serie" → bottom sheet). **Solo UI**: logica offline, `logDefaults`, `useRestTimer`, notifiche restano come sono; i test esistenti devono passare.
3. **Fine allenamento** (`CelebrationView`): fondo arancio, mascotte che festeggia, tre tile crema (durata, volume, record), bottone ink "Torna alla Home".
4. **Progressi**: segmented ink, card indaco con numero grande e barre settimanali (ultima arancio), tile record e serie, ultimo allenamento.
5. **Schede**, **Account**, **stati vuoti** (struttura M3, pelle Sole), **Login/Registrazione**, **builder scheda mobile** (M2).

### F3 — Web: design sul canvas (prima del codice)
Tavole coach in stile Sole sulla stessa canvas, una riga nuova: Login, Dashboard, Clienti, Dettaglio cliente, Analisi, Modifica scheda. Linee guida:
- Sfondo crema, **sidebar bianca**; voce attiva = pill ink; logo con la "a" arancio (oggi azzurra).
- CTA principale per pagina in arancio con testo cacao ("Nuova scheda", "Invita cliente", "Salva").
- KPI: card bianche, numero grande cacao, nota sotto in `text`; la card "Da controllare" in `dangerBg`.
- Stati scheda: Attiva = `dataBg`/`data`; In scadenza = `accentBg`/`accentText`; Scaduta/Revocata = `dangerBg`/`danger`.
- Grafici in indaco, periodo corrente in arancio.
- Tabelle: righe alte 56, separatori `border`, niente bordo esterno grigio scuro.
Approvazione delle tavole → F4.

### F4 — Web: fondamenta
- `fe/src/styles/tokens.css`: valori Sole + token ★ (unica fonte, come da D1).
- `index.html`: Plus Jakarta Sans al posto di Roboto; `color-scheme: light` in `index.css` e `appShell/style.css`.
- Primitive in `components/`: `button` (pill, varianti), `input`, `card`, `toast`, `confirmDialog`, `skeleton` (shimmer chiaro), `appShell` (sidebar bianca), `brandLogo`, `pageHeader`, `pageError`.
- Storybook: aggiornare `Foundations.stories.tsx` e le storie; addon a11y senza violazioni di contrasto.
- Check: `npm run lint`, `npm run build`, `npm test`.

### F5 — Web: pagine
Dashboard (KPI, tabella atleti, task, library), Clienti + Dettaglio, Analisi (`weeklychart`, `alertstable`, `kpigrid`), builder scheda (`programbuilder/*`, incluso incolla TXT), Template, Schede assegnate, Impostazioni, Login/Registrazione. Grazie alla regola "token-only page CSS" la maggior parte cambia da sola: qui si sistemano layout, pill e stati.

### F6 — Chiusura
- Script contrasto in CI.
- Nuovi screenshot in `docs/screenshots/` e README.
- `WORKBOOK.md`: M4 ✅ con note.

## Rischi

- **Overlay e bordi pensati per il fondo scuro** (`rgba(255,255,255,…)`, `rgba(224,224,224,.12)`): su crema spariscono. Cercarli tutti in F1/F4.
- **Arancio con testo bianco**: errore facile da fare; il token `onAccent` è cacao e la review deve controllarlo.
- **Lottie**: i colori sono nel JSON; la ricolorazione va verificata su tutte e 4 le animazioni.
- **Android**: barra di navigazione e status bar vanno impostate chiare, altrimenti resta una fascia nera.
- **Coach che lavorano a lungo sul web**: crema e bianco devono restare riposanti; niente arancio come sfondo di intere sezioni nel pannello (solo CTA, stati e grafici).
