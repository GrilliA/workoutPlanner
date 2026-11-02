# apps/android/ — TRACCIA (Kotlin + Jetpack Compose)

Client **Android nativo** dell'app atleta. Kotlin + Jetpack Compose + Hilt.
Convive con l'app Expo in [`mobile/`](../../mobile) (applicationId diverso: `com.traccia.android` vs `com.traccia.app` — si installano entrambe sullo stesso telefono). Stesso backend ([`be/`](../../be)), stesso contratto API, stessa UX. Piano completo: [`docs/plans/android-native.md`](../../docs/plans/android-native.md).

---

## Perché esiste questa cartella (accanto a `mobile/`)

| | `mobile/` (Expo) | `apps/android/` (questo) |
| --- | --- | --- |
| Linguaggio / UI | TypeScript + React Native | Kotlin + Jetpack Compose, Material 3 |
| Build | Metro / EAS | Gradle (progetto autonomo) |
| Navigazione | Expo Router (file-based) | Navigation Compose, route type-safe `@Serializable` |
| DI | — | Hilt |
| Stato | `useState` / context | `ViewModel` + `StateFlow`, `remember` |
| applicationId | `com.traccia.app` | `com.traccia.android` |

L'app Expo resta il riferimento di comportamento e copy finché la nativa non arriva a parità (scheda N12 del piano).

---

## Setup

Prerequisiti: **JDK 17** e **Android SDK** (cmdline-tools, `platforms;android-37.0`, `build-tools;36.0.0`, `platform-tools`). Sulle VM Devin vengono installati da `environment.yaml`, in CI dal job `android` di `.github/workflows/ci.yml` (setup-java + l'SDK del runner); in locale:

1. Installa **Android Studio** (porta JDK 17 embedded e l'SDK) oppure installa i command-line tools a mano.
2. Crea `apps/android/local.properties`:

```properties
sdk.dir=/percorso/del/tuo/Android/Sdk
# opzionale — punta l'app al backend locale `be` (10.0.2.2 = host visto dall'emulatore)
traccia.apiBaseUrl=http://10.0.2.2:3005/api
```

Senza `traccia.apiBaseUrl` l'app usa il default di produzione Railway (come `mobile/src/api/config.ts`). **Non chiamare mai la prod in sviluppo/test.**

## Emulatore

Da Android Studio: **Device Manager → Create Device** (es. Pixel 7, API 36+). Da riga di comando:

```bash
avdmanager create avd -n traccia -k "system-images;android-36;google_apis;x86_64" -d pixel_7
emulator -avd traccia
```

## Comandi

```bash
cd apps/android
./gradlew lintDebug testDebugUnitTest assembleDebug   # verifica completa (CI)
./gradlew installDebug                               # installa su emulatore/device attivo
```

## Mappa package

```
app/src/main/java/com/traccia/android/
├── TracciaApp.kt                 # @HiltAndroidApp
├── MainActivity.kt               # @AndroidEntryPoint, edge-to-edge
├── core/
│   ├── designsystem/             # tema, token, componenti condivisi
│   ├── navigation/               # Routes.kt (tutte le route), RootNavHost, MainShell
│   ├── network/                  # Retrofit, OkHttp, interceptor, ApiError
│   │   └── model/                # DTO @Serializable (porting 1:1 degli schemi Zod)
│   └── auth/                     # TokenStore, AuthRepository, SessionState
└── feature/
    └── <nome>/                   # una cartella per feature: data/ + ui/
```

## Glossario React Native / Expo → Compose

| RN / Expo (`mobile/`) | Equivalente qui |
| --- | --- |
| `<View>` | `Box` / `Column` / `Row` (o `Surface`) |
| `<Text>` | `Text` |
| `StyleSheet.create` | `Modifier` (`padding`, `background`, …) |
| `useState` | `remember { mutableStateOf(...) }` in UI; `StateFlow` nel `ViewModel` |
| `useEffect` | `LaunchedEffect` / `DisposableEffect` |
| Context provider | Hilt (`@HiltAndroidApp`, `@AndroidEntryPoint`, `@HiltViewModel`) |
| Expo Router (file route) | Navigation Compose con `@Serializable` route in `core/navigation/Routes.kt` |
| `type` + schema Zod | `@Serializable data class` + `kotlinx.serialization` |
| `fetch` + `apiRequest` | Retrofit + OkHttp |
| SecureStore | DataStore (cifrato via AndroidKeyStore) |
| `StyleSheet` colori | `MaterialTheme.colorScheme` da `core/designsystem/Theme.kt` |
| jest / tsx --test | JUnit + Robolectric; Roborazzi per gli screenshot |

React e Compose sono entrambi UI dichiarativi a stato: il concetto "la UI è una funzione dello stato" è lo stesso, cambia il toolkit.
