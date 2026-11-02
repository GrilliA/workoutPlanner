# Traccia: design system attuale (tema "Sole", M4)

## Cosa è cambiato (aggiornamento del 17/10/2026, 16:45)
Dopo la #83 su `main` c'è **un solo merge**: la **PR #84** "feat(mobile): animate the tab bar and keep floating actions off the keyboard" (commit `34e52d8`, mergiata il 17/10 alle 16:34, ora di Roma; 23 file, solo mobile). Non ci sono altre PR aperte aggiornate oggi: l'unica aperta è la #55 (Android nativo), ferma.
- **Token, font, colori, logo: invariati.** La #84 non tocca `mobile/src/theme/*`, `fe/src/styles/tokens.css`, `docs/plans`, `docs/screenshots` né `app.json`.
- **Mascotte robot rimossa**: `wave.json` è stato cancellato e il robot non compare più nel login, nella card "Oggi tocca a" della Home, nella fine allenamento e nello stato vuoto "Ancora nessuna scheda" (`login.tsx`, `TodayCard.tsx`, `CelebrationView.tsx`, `HomeScreen.tsx`, `Mascot.tsx`, `lottie/CREDITS.md`). Restano solo `waiting`, `sleeping` (gatti) e `notebook`, e negli stati vuoti la mascotte ora è facoltativa. La fine allenamento ha solo particelle bianche, titolo, tile e bottone ink.
- **Tab bar animata** (`GlassTabBar.tsx`): la tab attiva si allarga in 260 ms (easing cubic-out), la pill ink compare e appare l'etichetta. Cambiando tab lo schermo non sfuma più (`animation: "none"`).
- **"Termina allenamento"** (`SessionActionBar.tsx`) non è più una fascia con bordo: è una **pill bianca flottante con l'ombra della tab bar**, alta 64px. Le azioni flottanti si nascondono quando la tastiera è aperta (`useKeyboardVisible.ts`).
- **Builder scheda mobile** (`WorkoutExerciseSheet.tsx`, `SetPrescriptionEditor.tsx`, `WorkoutBuilder.tsx`): foglio "Nuovo/Modifica esercizio" con filtri per gruppo muscolare (Petto, Schiena, Gambe, Spalle, Braccia), prescrizione delle serie con selettori a rotella (verticali e orizzontali), bottoni "Salva esercizio", "Salva esercizi" e "Salva scheda". Ogni giorno viene validato da solo, prima di chiedere il nome della scheda.
- Gli screenshot in `docs/screenshots/` **non sono stati rigenerati**: mostrano ancora il robot.


_Analisi del 17/10/2026 su `GrilliA/workoutPlanner`, branch `main`. Il tema Sole è entrato con la PR #83 "feat: Sole theme, set prescriptions, and coach builder (M4, W9)", mergiata il 17/10/2026 alle 14:10 (ora di Roma). Prima c'era un tema **scuro azzurro** (M3b), che il WORKBOOK definisce "freddo e tecnico" e che è stato sostituito._

Fonti principali: `docs/plans/M4-design-sole.md`, `mobile/src/theme/colors.ts`, `fe/src/styles/tokens.css`, `WORKBOOK.md` (Decisioni 2026-10-17, roadmap M3/M4), `mobile/app.json`, `fe/src/components/{button,card,brandLogo}/style.css`, `mobile/src/components/icon/Icon.tsx`, `docs/screenshots/*.png`.

## 1. Direzione
Chiaro, caldo, amichevole e premium. **Una sola azione principale per schermata** (M3). C'è **solo il tema chiaro**: il dark mode è fuori da M4, ma i token sono semantici e permettono di aggiungerlo dopo.

## 2. Colori (uguali su mobile `colors.ts` e web `tokens.css`)
| Token | Valore | Uso |
|---|---|---|
| `bg` / `--bg` | `#FFF8F1` | sfondo crema |
| `surface` | `#FFFFFF` | card, tab bar, input |
| `surfaceElevated` | `#FFF8F1` | blocchi dentro le card (stepper, righe) |
| `border` | `#F0E4D8` | bordi 1px |
| `textHeading` / `--text-h` | `#231A14` | titoli (cacao) |
| `text` | `#6F625A` | testo secondario |
| `accent` | `#FF7A45` | arancio, **solo come riempimento** (bottone primario, card "Oggi", periodo corrente) |
| `onAccent` | `#231A14` | testo sopra l'arancio: **sempre cacao, mai bianco** |
| `accentBg` / `accentText` / `accentBorder` | `#FFE7DA` / `#A33A12` / `#FFC2A6` | chip tenui / testo arancio su chiaro / bordo di selezione |
| `ink` / `onInk` | `#231A14` / `#FFFFFF` | bottone scuro, tab attiva, segmented control attivo |
| `data` / `dataBg` | `#3B3F9E` / `#E6E7FA` | indaco per grafici, numeri, card Progressi, avviso recupero |
| `danger` / `dangerBg` | `#B42318` / `#FDE4E1` | errori, "Scaduto", "Da controllare" |
| `warning` / `warningBg` | `#7A5410` / `#FDF1D8` | avvisi |
| `scrim` | `rgba(35,26,20,.4)` | velo dietro i bottom sheet |

Contrasto ≥ 4.5:1 su 42 coppie di colori, verificato in CI (`scripts/check-contrast.mjs`, job `Contrast`).

## 3. Tipografia
- **Plus Jakarta Sans** 400/500/600/700/800 su web e mobile (sostituisce Roboto e il font di sistema). Su mobile arriva da `@expo-google-fonts/plus-jakarta-sans`, con un peso per famiglia (`fontFamilies`).
- Scala mobile (`typography`): title 30/800 (lh 36, tracking −0.6) · heading 22/800 · body 16/500 · label 14/600 · eyebrow e meta 13/700 e 13/600. Il piano prevede anche un display 52/800 e tracking −2% sopra i 28px.
- Web: `--text-xs` 13px, `--text-sm` 14px, `--text-base` 16px, `--text-lg` 18px.

## 4. Spaziatura, raggi, ombre
- Spaziatura mobile: 4 / 8 / 16 / 24 / 32. Web: scala da 4px (`--space-1` … `--space-8`).
- Raggi: card 24–32 (`radii.lg` 24, `xl` 32; web `--radius-xl` 24px), input 16, **bottoni, chip e tab a pillola (999)**.
- Ombra delle card: `0 1px 2px rgba(35,26,20,.04), 0 10px 28px rgba(35,26,20,.07)`. Tab bar: `0 14px 34px rgba(35,26,20,.12)`. Le card hanno ombra e nessun bordo grigio.

## 5. Componenti
- **Bottoni** (`fe/src/components/button/style.css`): tutti a pillola. *primary* = arancio con testo cacao 800; *ink* = cacao con testo bianco; *secondary* = bianco con bordo `border`; *ghost*. Su mobile il primario è alto 58–64px.
- **Card**: bianche, ombra morbida, raggio 24. La card "Oggi tocca a" è arancio piena, con bottone ink "Inizia allenamento".
- **Navigazione mobile**: `GlassTabBar`, una pillola bianca flottante. La tab attiva è una pillola ink con icona ed etichetta, le altre mostrano solo l'icona (Home, Schede, Progressi, Account). Dalla #84 la tab attiva si apre con un'animazione di 260 ms.
- **Web coach**: sidebar bianca, voce attiva a pillola ink, CTA arancio ("Nuova scheda") accanto a una secondaria ("Invita cliente").
- **Stati scheda**: Attivo = indaco tenue · In scadenza = arancio tenue · Scaduto = rosso tenue · In pausa = crema.
- **Grafici**: barre indaco, la settimana o il periodo in corso in arancio.
- **Mascotte**: dopo la #84 il robot indaco non c'è più. Restano solo Lottie facoltative negli stati vuoti (gatti `waiting`/`sleeping`, `notebook`). Il brand non ha più un personaggio.
- **Bottom sheet** per "Cambia allenamento" e "Tutte le serie".

## 6. Iconografia
SVG a linea su griglia 24, tratto 1,8 e punte arrotondate; "home" è piena (`mobile/src/components/icon/Icon.tsx`: home, workout ⟷, stats a barre, history, settings, person, pencil, key, logout). Le stesse icone si usano nella nav web.

## 7. Tono del copy
Italiano, frase normale, **niente MAIUSCOLO con tracking** (deciso in M3), bottoni in sentence case, aree tappabili ≥ 48px. Tono amichevole e diretto: "Ciao, Marco", "Oggi tocca a", "Inizia allenamento", "Cambia allenamento", "Serie fatta", "Allenamento fatto!", "Torna alla Home", "Bentornato", "Accedi per allenarti e registrare le serie.", "Ultima volta: 77.5kg × 8", "Obiettivo: 8 reps · RIR 2". Nei mockup non si inventano numeri (i valori ignoti vanno tra parentesi quadre).

## 8. Nome e brand
- Nome app: `TRACCIA` (`app.json` `name`), scheme `traccia`, package `com.traccia.app`.
- Logotipo nell'interfaccia: **"traccia"** minuscolo, Plus Jakarta Sans 800, tracking −0.03em, con l'ultima **"a" in arancio** `#FF7A45`. Nel pannello web compare il badge "Coach" in `accentText`.
- Splash e barra di navigazione Android su `#FFF8F1`, colore delle notifiche `#FF7A45`, `userInterfaceStyle: "light"`.
- "workoutPlanner" resta solo il nome del repo.

## 9. Schermate e feature chiave (screenshot in `docs/screenshots/`)
- **Home**: "Ciao, Marco" + data, settimana a chip (oggi in ink, punto arancio sui giorni con allenamento), card arancio "Oggi tocca a Legs" (senza mascotte dalla #84), tile indaco "3 allenamenti negli ultimi 7 giorni", tile "Ultimo allenamento".
- **Allenamento, una serie alla volta**: barra a 4 segmenti, timer, banner indaco "Recupero consigliato 02:00 [Avvia]", chip "Serie 2 di 4", "Ultima volta", obiettivo con reps e RIR, stepper peso, ripetizioni e RIR con −/+ rotondi, "Tutte le serie" in un bottom sheet, "Termina allenamento" come pill bianca flottante (#84). Funziona offline (O1–O9).
- **Fine allenamento**: schermo arancio pieno con particelle bianche (robot rimosso nella #84), "Allenamento fatto!", tre tile crema (Durata, Volume, Serie), bottone ink.
- **Progressi**: segmented 4 settimane / 12 settimane / 1 anno, card indaco con numero grande e barre settimanali (l'ultima arancio), tile Record e Serie (giorni di fila), progressione per esercizio (e1RM / Peso max).
- **Builder scheda mobile** (#84): filtri per gruppo muscolare e serie impostate con selettori a rotella.
- **Schede**: card "In uso · dal coach" con validità e giorni, "Le mie schede" con badge (In pausa, Disattiva), "+ Nuova scheda" tratteggiata.
- **Coach web**: KPI (Clienti attivi, Atleti attivi, In scadenza, Da controllare in rosso), grafico Rinnovi, Gestione atleti con stati, Task prioritari, Library template, Attività recente. Builder con carico, RIR, range di ripetizioni e note per serie (W9).
