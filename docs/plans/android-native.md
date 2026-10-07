# Piano — App Android nativa (track N)

App atleta **nativa Android** (Kotlin + Jetpack Compose) in `apps/android/`, accanto all'app Expo in `mobile/`.
Stesso backend (`be/`), stesso contratto API (schemi Zod in `mobile/src/api/schemas/`), stessa UX dell'app Expo.
L'app Expo **resta** finché la nativa non arriva a parità (N12).

Il piano è pensato per essere eseguito da **sessioni Devin Cloud in parallelo**: una sessione = una PR.
Ogni sessione deve leggere per intero la sezione [Contratto comune](#contratto-comune) + la propria scheda PR.

Obiettivo secondario, esplicito: **imparare Kotlin/Android**. Ogni PR spiega cosa introduce (vedi [Descrizione PR](#descrizione-pr)).

---

## Decisioni già prese

| Tema | Scelta |
| --- | --- |
| Cartella | `apps/android/` (progetto Gradle autonomo, nessun legame con `mobile/android/` generato da Expo) |
| applicationId / package | `com.traccia.android` — convive con l'app Expo (`com.traccia.app`) sullo stesso telefono |
| Linguaggio / UI | Kotlin, Jetpack Compose, Material 3 |
| Architettura | MVVM: `@Composable` Screen ← `ViewModel` (`StateFlow<UiState>`) ← Repository ← Retrofit API |
| DI | Hilt |
| Rete | Retrofit + OkHttp + kotlinx.serialization |
| Navigazione | Navigation Compose con route type-safe (`@Serializable`) |
| Persistenza | DataStore (token, preferenze). Room solo in N11 |
| Async | Coroutines + Flow |
| Test | JUnit + Turbine (Flow) + MockWebServer + Roborazzi (screenshot JVM, niente emulatore) |
| Copy UI | Italiano. Codice, nomi, commit in inglese |
| Min / target SDK | minSdk 26, targetSdk/compileSdk = ultimo stabile |

Versioni librerie: le sceglie N1 nel version catalog, **stabili e pubblicate da almeno 7 giorni**. Nessun `+` / range dinamico.

---

## Contratto comune

Regole che **tutte** le PR rispettano. Servono a far lavorare più sessioni in parallelo senza conflitti.

### Struttura package

```
apps/android/app/src/main/java/com/traccia/android/
├── TracciaApp.kt                 # @HiltAndroidApp
├── MainActivity.kt
├── core/
│   ├── designsystem/             # tema, token, componenti condivisi (N3)
│   ├── navigation/               # Routes.kt, RootNavHost.kt, MainShell (N1/N3)
│   ├── network/                  # Retrofit, OkHttp, interceptor, ApiError (N2)
│   │   └── model/                # DTO @Serializable = porting 1:1 degli schemi Zod (N2)
│   └── auth/                     # TokenStore, AuthRepository, SessionState (N2)
└── feature/
    └── <nome>/                   # una cartella per feature: data/ + ui/
        ├── data/                 # <Nome>Api (Retrofit), <Nome>Repository
        └── ui/                   # <Nome>Screen, <Nome>ViewModel, componenti privati
```

### Regole di ownership (anti-conflitto)

1. Una PR modifica **solo** il proprio `feature/<nome>/` + i file elencati nella sua scheda sotto "Tocca anche".
2. **Route**: tutte dichiarate in N1 dentro `core/navigation/Routes.kt`. Una feature PR non aggiunge route; sostituisce solo il `PlaceholderScreen` della sua route in `RootNavHost.kt` / `MainShell.kt` (una riga).
3. **DTO**: tutti creati in N2 in `core/network/model/`, un file per ogni file in `mobile/src/api/schemas/`. Se a una feature serve un campo mancante, lo aggiunge lì (modifica piccola, descritta nella PR).
4. **Stringhe**: un file risorse per feature, `res/values/strings_<feature>.xml`. Mai toccare quelli di altre feature.
5. **Componenti UI** condivisi solo in `core/designsystem` (N3). Una feature che ne vuole uno nuovo lo tiene privato in `feature/<nome>/ui/`; la promozione a condiviso è una PR a parte.
6. **Dipendenze Gradle**: solo via `gradle/libs.versions.toml`. Se una PR aggiunge una libreria, lo dice nella descrizione con il motivo.

### Fonte di verità

- Comportamento e copy: le schermate Expo in `mobile/app/` e `mobile/src/features/`. In caso di dubbio, **fare come l'app Expo**.
- Contratto API: `mobile/src/api/*.ts` (endpoint, metodo, query) + `mobile/src/api/schemas/*.ts` (forma dei dati).
- Auth mobile: header `X-Client: mobile` su ogni richiesta; il refresh token arriva nel body JSON e si rimanda in `POST /auth/refresh` `{ refreshToken }`. Vedi `mobile/src/api/client.ts`.
- Errori in italiano: porting di `ApiError.messageFrom` (`mobile/src/api/client.ts`).
- Token design: `mobile/src/theme/colors.ts` + gli stili dei componenti in `mobile/src/components/`. Font di sistema (come l'app Expo).

### Rete in sviluppo e test

- `BuildConfig.API_BASE_URL`: default Railway prod (come `mobile/src/api/config.ts`), sovrascrivibile da `local.properties` (`traccia.apiBaseUrl=http://10.0.2.2:3005/api`).
- **Le sessioni cloud non chiamano mai la prod.** I test usano MockWebServer. Per prove manuali: `be` locale (vedi `environment.yaml`) + emulatore se disponibile.

### Verifica (ogni PR)

```bash
cd apps/android
./gradlew lintDebug testDebugUnitTest assembleDebug
./gradlew verifyRoborazziDebug   # da N3 in poi
```

Ogni schermata nuova ha almeno: un test sul ViewModel (stati loading / dati / errore) e uno screenshot Roborazzi. Gli screenshot generati vanno allegati alla PR.

### Branch e commit

- Branch: `feat/N<k>-android-<slug>` (es. `feat/N2-android-auth`), da `main` aggiornato.
- Conventional Commits con scope `android`: `feat(android): login screen`.
- Una PR per scheda. Niente lavoro fuori scheda.
- Chi chiude la PR aggiunge una riga a "What we did" in `WORKBOOK.md` e spunta la scheda nella [tabella](#pr-e-dipendenze).

### Descrizione PR

In italiano, con queste sezioni:

```
## Cosa fa
## Cosa impari (Kotlin / Android)
- <concetto> — <spiegazione breve> — equivalente in RN/TS: <...>
## Come verificare
## Screenshot
```

"Cosa impari" è obbligatoria: 3–6 concetti nuovi introdotti dalla PR, ciascuno con il parallelo nel codice Expo che l'autore già conosce (es. `StateFlow` ↔ `useState`, `LaunchedEffect` ↔ `useEffect`, `data class` ↔ `type` + Zod).

---

## PR e dipendenze

| PR | Titolo | Dipende da | Ondata | Stato |
| --- | --- | --- | --- | --- |
| N1 | Scaffold progetto + CI | — | 1 | [x] |
| N2 | Rete + auth + login | N1 | 2 | [ ] |
| N3 | Design system + shell a tab | N1 | 2 | [ ] |
| N4 | Registrazione + Account | N2, N3 | 3 | [ ] |
| N5 | Home | N2, N3 | 3 | [ ] |
| N6 | Schede: lista + dettaglio | N2, N3 | 3 | [ ] |
| N7 | Sessione: logging serie + recupero in-app | N2, N3 | 3 | [ ] |
| N8 | Progressi | N2, N3 | 3 | [ ] |
| N9 | Notifica recupero + fine sessione + deep link | N7 | 4 | [ ] |
| N10 | Builder scheda + catalogo + import TXT | N6 | 4 | [ ] |
| N11 | Cache offline (Room) | N5, N6, N7 | 5 | [ ] |
| N12 | Release: firma, icona, Play internal track | N4–N10 | 5 | [ ] |

```
Ondata 1:  N1
Ondata 2:  N2 ─┬─ N3                (parallele)
Ondata 3:  N4  N5  N6  N7  N8       (parallele, dopo merge di N2 e N3)
Ondata 4:  N9 (dopo N7)  N10 (dopo N6)
Ondata 5:  N11  N12
```

Regola per l'orchestratore: lanciare una PR solo quando **tutte** le sue dipendenze sono mergiate in `main`.

---

## Schede PR

### N1 — Scaffold progetto + CI

**Obiettivo:** progetto Gradle che compila, app che si apre su una schermata placeholder con il tema scuro, CI verde.

- Progetto in `apps/android/` con Gradle wrapper, Kotlin DSL, version catalog, modulo unico `:app`.
- Plugin: Android application, Kotlin, Compose compiler, kotlinx.serialization, Hilt (KSP), Roborazzi.
- `TracciaApp` (`@HiltAndroidApp`), `MainActivity` (`@AndroidEntryPoint`, edge-to-edge) → `RootNavHost`.
- `core/navigation/Routes.kt` con **tutte** le route del piano:
  `Login`, `Register`, `Main` (contenitore tab), `Home`, `Workouts`, `Stats`, `Account`,
  `WorkoutDetail(workoutId: Long)`, `WorkoutEditor(workoutId: Long?)`, `Session(sessionId: Long)`, `SessionComplete(sessionId: Long)`.
- `RootNavHost.kt`: grafo root `Login` / `Register` / `Main`, ognuna con `PlaceholderScreen("<nome>")`. Start destination `Login` (la logica di gate arriva in N2).
- `core/designsystem/Theme.kt` minimo: colori base da `mobile/src/theme/` (sfondo charcoal, accent `#bfdbf7`), schema solo scuro. Il resto in N3.
- `BuildConfig.API_BASE_URL` come da [Rete](#rete-in-sviluppo-e-test).
- Job `android` in `.github/workflows/ci.yml`: JDK 17 (`actions/setup-java`, temurin) + cache Gradle, esegue `./gradlew lintDebug testDebugUnitTest assembleDebug` in `apps/android`.
- `environment.yaml`: in `initialize` installa JDK 17 + Android command-line tools + `platforms;android-<compileSdk>` + `build-tools`, imposta `ANDROID_HOME`; in `knowledge` aggiunge i comandi Gradle a `lint` / `test`.
- Doc: `apps/android/README.md` (setup Android Studio, emulatore, `local.properties`, comandi, glossario RN → Compose sul modello di `mobile/README.md`), `docs/guidelines/android.md` (questo contratto in forma di regole permanenti), righe in `AGENTS.md` (dev env + tabelle layout/guidelines).

**Tocca anche:** `.github/workflows/ci.yml`, `environment.yaml`, `AGENTS.md`, `docs/guidelines/`.
**Fatto quando:** CI verde con il nuovo job; l'APK debug si installa e mostra "Login" su sfondo scuro.

### N2 — Rete + auth + login

**Obiettivo:** login reale, sessione persistente, refresh automatico, logout.

- `core/network/model/`: porting di **tutti** gli schemi in `mobile/src/api/schemas/*.ts` in `@Serializable data class` / `enum class` (un file Kotlin per file TS). Date ISO → `kotlinx.datetime` o `String` + parser, scelta documentata nel file. Campi `.optional()` → nullable con default `null`; `.default(x)` → default Kotlin.
- `Json { ignoreUnknownKeys = true; explicitNulls = false }`.
- OkHttp: interceptor che aggiunge `Accept`, `X-Client: mobile`, `Authorization: Bearer <access>`; `Authenticator` sul 401 che fa **un solo** `POST /auth/refresh` anche con richieste concorrenti (`Mutex`), salva i nuovi token, ripete la richiesta; se il refresh fallisce → sessione scaduta.
- `ApiError` + `messageFrom` in italiano (porting di `mobile/src/api/client.ts`, incluse rete assente / 401 / 5xx).
- `core/auth/TokenStore`: access token in memoria, refresh token in DataStore cifrato con chiave AndroidKeyStore (AES/GCM).
- `AuthRepository`: `login`, `me`, `logout`, `sessionState: StateFlow<SessionState>` (`Unknown` / `LoggedOut` / `LoggedIn(user)`).
- Gate in `RootNavHost`: all'avvio `Unknown` → splash, poi `GET /auth/me` → `Main` o `Login`. Gli utenti `coach` vedono la schermata di blocco come `mobile/src/auth/CoachBlockScreen.tsx`.
- `feature/auth/ui/LoginScreen` + `LoginViewModel`: email, password, errore, loading, link "Registrati" verso `Register` (placeholder fino a N4). Copy da `mobile/app/(auth)/login.tsx`.
- Test: MockWebServer per login, 401 → refresh → retry, refresh concorrente (2 richieste → 1 refresh), refresh fallito → `LoggedOut`; `LoginViewModel` con Turbine.

**Tocca anche:** `core/navigation/RootNavHost.kt` (solo il nodo `Login` e il gate).
**Fatto quando:** test verdi; con `be` locale, login → placeholder `Main`, kill app → riapre loggato.

### N3 — Design system + shell a tab

**Obiettivo:** componenti condivisi e la tab bar, così le feature costruiscono solo schermate.

- Token completi in `core/designsystem/`: colori da `mobile/src/theme/colors.ts`, spacing / radius / tipografia ricavati dagli stili di `mobile/src/components/` (font di sistema).
- Componenti, sul modello di `mobile/src/components/` (`button`, `input`, `card`, `emptystate`, `mascot`, `bottomsheet`, `feedback`, `glasstabbar`, `listrow`, `statcard`): `TracciaButton` (primary / secondary / ghost, loading), `TracciaTextField`, `TracciaCard`, `EmptyState` (+ `Mascot` Lottie con `lottie-compose`, asset da `mobile/assets/lottie/` con crediti), `TracciaBottomSheet` (`ModalBottomSheet`), `LoadingState`, `ErrorState(message, onRetry)`.
- `MainShell`: `Scaffold` con tab bar flottante a pillola stile `GlassTabBar` (Home / Schede / Progressi / Account, badge sulla tab Schede pilotato da un parametro `hasUnseenAssignment`), nested `NavHost` con le 4 tab come `PlaceholderScreen`.
- Catalogo: una `@Preview` + uno screenshot Roborazzi per ogni componente.

**Tocca anche:** `core/navigation/RootNavHost.kt` (solo il nodo `Main` → `MainShell`).
**Fatto quando:** screenshot di tutti i componenti e della shell allegati; nessuna feature dentro.

### N4 — Registrazione + Account

Fonte: `mobile/app/(auth)/register.tsx`, `mobile/app/(app)/settings.tsx`, `mobile/src/api/auth.ts`, `athlete.ts`, `assignments.ts`.

- `Register`: `POST /auth/register` → loggato.
- Tab `Account`: profilo (nome, `PATCH /auth/me`), cambio password (`PATCH /auth/password`, salva l'eventuale nuovo refresh token), sezione COACH (`GET /athlete/coach`, collega con codice `POST /athlete/coach/link`, scollega `DELETE /athlete/coach`), revoca scheda attiva se presente nell'app Expo, logout.

### N5 — Home

Fonte: `mobile/app/(app)/index.tsx`, `mobile/src/features/home/`, `GET /athlete/home` (`schemas/athletehome.ts`).

- Una sola chiamata `GET /athlete/home`: card di oggi, `WeekStrip`, prossimo allenamento, sessioni ultimi 7 giorni, ultima sessione, stati `noProgramReason` con le CTA come in Expo.
- "Avvia" → crea la sessione (`POST /workouts/{id}/sessions`) → `Session(sessionId)`.
- `hasUnseenAssignment` passato al badge di `MainShell`.

### N6 — Schede: lista + dettaglio

Fonte: `mobile/app/(app)/workouts.tsx`, `mobile/app/workout/[workoutId].tsx`, `mobile/src/api/workouts.ts`, `workoutdays.ts`.

- Lista schede (coach in sola lettura, self modificabili), dettaglio scheda con giorni ed esercizi, avvio sessione da un giorno → `Session(sessionId)`. I pulsanti crea/modifica navigano a `WorkoutEditor` (placeholder fino a N10).

### N7 — Sessione: logging serie + recupero in-app

Fonte: `mobile/app/session/[sessionId].tsx`, `mobile/src/features/session/`, `mobile/src/api/sessions.ts`.

- Pager esercizi, card esercizio con media (flip 0.jpg / 1.jpg), serie precedenti (`loadPreviousSets`), default di log (`logDefaults`), aggiungi / modifica / elimina serie, completa sessione → `SessionComplete`.
- Timer di recupero **in-app** (card + haptics), stato che sopravvive a rotazione e process death (`SavedStateHandle` + orario di fine assoluto, come `useRestTimer`).
- Porting dei test esistenti `logDefaults.test.ts` e `celebrationStats.test.ts` → unit test Kotlin; test nuovo per il porting di `groupSetsByExercise`.

### N8 — Progressi

Fonte: `mobile/app/(app)/stats.tsx`, `mobile/src/features/stats/`, `GET /stats?range=`, `GET /sessions/history`.

- Filtro periodo, KPI grid, grafico settimanale (Canvas Compose, niente librerie grafici salvo motivazione nella PR), card volume, progressione esercizio, storico sessioni. Porting dei mapper + `mapProgressStats.test.ts`.

### N9 — Notifica recupero + fine sessione + deep link

Fonte: `mobile/modules/rest-timer-notification/` (Kotlin già scritto), `mobile/src/features/session/restTimerNotifications.ts`, `useRestNotificationRouting.ts`, `CelebrationView.tsx`, `mobile/app/session/complete.tsx`.

- Notifica ongoing con countdown di sistema (riuso del codice Kotlin del modulo Expo, senza il bridge), Live Update Android 16, azione "Salta", notifica di fine anche ad app chiusa (`AlarmManager` esatto o `WorkManager`, scelta motivata), permesso `POST_NOTIFICATIONS`.
- Deep link `traccia://session/<id>` (e `?rest=skip`) su `Session`. Schema `traccia` anche nell'app Expo: documentare nel README quale app lo riceve quando sono installate entrambe.
- `SessionComplete`: schermata celebrazione con Lottie.

### N10 — Builder scheda + catalogo + import TXT

Fonte: `mobile/src/features/workoutprogram/` (`WorkoutDraft`, `WorkoutBuilder`, test), `mobile/src/api/catalog.ts`, decisione M2 in `WORKBOOK.md`.

- Una bozza locale (giorni → esercizi → serie) nel ViewModel, un solo "Salva scheda" (POST / PUT upsert), ricerca catalogo bilingue con facets, esercizio custom, weekday unici per giorno, import TXT nella bozza. Porting di `workoutDraft.test.ts` e `prescriptionDraft.test.ts`.

### N11 — Cache offline (Room)

- Room per schede, home e sessione aperta: si apre e si logga senza rete, sync al ritorno. Il design (cosa è cache, cosa è coda di scritture, conflitti) va **proposto nella PR prima del codice** e approvato.

### N12 — Release

- Icona adattiva, splash (`core-splashscreen`), R8 + regole serialization/Retrofit, firma release via secret GitHub, workflow che pubblica l'AAB sul Play **internal testing**. I secret li configura l'autore del repo; la PR documenta quali servono.

---

## Lancio con Devin Cloud

Prerequisito: N1 mergiata (porta JDK + Android SDK in `environment.yaml`) e snapshot dell'ambiente ricostruito.

Prompt per ogni sessione (sostituire `<Nk>`):

```
Repo workoutPlanner. Implementa la PR <Nk> di docs/plans/android-native.md.
Leggi prima AGENTS.md, docs/guidelines/android.md e in docs/plans/android-native.md
le sezioni "Decisioni già prese", "Contratto comune" e la scheda <Nk>.
Lavora su un branch feat/<Nk>-android-<slug> da main aggiornato.
Resta nello scope della scheda e rispetta le regole di ownership.
Verifica con i comandi di "Verifica"; non chiamare mai l'API di produzione.
Apri la PR con la descrizione nel formato "Descrizione PR", screenshot Roborazzi allegati.
Se la scheda è ambigua o serve una decisione nuova (nome, libreria, cartella),
fermati e proponi 2–3 opzioni invece di scegliere.
```

Ordine: ondata 1 → merge → ondata 2 (2 sessioni) → merge entrambe → ondata 3 (5 sessioni) → ondata 4 → ondata 5.
Review di ogni PR prima del merge; i conflitti attesi sono solo le righe dei placeholder in `RootNavHost.kt` / `MainShell.kt`.
