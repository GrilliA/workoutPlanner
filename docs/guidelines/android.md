# Android

Permanent rules for `apps/android/` (Kotlin + Jetpack Compose). These are the "Contratto comune" of [`docs/plans/android-native.md`](../plans/android-native.md) — that file also has the full PR list (N1–N12). One session = one PR card; stay in your card's scope.

## Package structure

```
apps/android/app/src/main/java/com/traccia/android/
├── TracciaApp.kt                 # @HiltAndroidApp
├── MainActivity.kt
├── core/
│   ├── designsystem/             # theme, tokens, shared components
│   ├── navigation/               # Routes.kt, RootNavHost.kt, MainShell
│   ├── network/                  # Retrofit, OkHttp, interceptors, ApiError
│   │   └── model/                # @Serializable DTOs = 1:1 port of mobile/src/api/schemas/
│   └── auth/                     # TokenStore, AuthRepository, SessionState
└── feature/
    └── <name>/                   # one folder per feature: data/ + ui/
        ├── data/                 # <Name>Api (Retrofit), <Name>Repository
        └── ui/                   # <Name>Screen, <Name>ViewModel, private components
```

## Ownership rules (parallel sessions)

1. A PR touches **only** its `feature/<name>/` plus the files listed under "Tocca anche" in its card.
2. **Routes** are all declared in `core/navigation/Routes.kt`. A feature PR never adds routes; it only replaces its route's `PlaceholderScreen` line in `RootNavHost.kt` / `MainShell.kt`. Root nodes (`Login`, `Register`, `Main`, `WorkoutDetail`, `WorkoutEditor`, `Session`, `SessionComplete`) live in `RootNavHost.kt`; the 4 tabs live in `MainShell.kt`.
3. **DTOs** live in `core/network/model/`, one Kotlin file per file in `mobile/src/api/schemas/`. If a feature needs a missing field, add it there (small change, described in the PR).
4. **Strings**: one resource file per feature, `res/values/strings_<feature>.xml`. Never touch other features' files.
5. **Shared UI** lives only in `core/designsystem`. A feature keeps new components private in `feature/<name>/ui/`; promotion to shared is a separate PR.
6. **Dependencies** only via `gradle/libs.versions.toml`: stable versions released ≥7 days ago, no `+` or dynamic ranges. Say what and why in the PR description.

## Architecture

- MVVM: `@Composable` Screen ← `ViewModel` (`StateFlow<UiState>`) ← Repository ← Retrofit API.
- DI with Hilt. Async with Coroutines + Flow.
- Navigation: Navigation Compose with type-safe `@Serializable` routes.
- UI copy is **Italian**; code, names and commits in English.

## Source of truth

- Behaviour and copy: the Expo screens in `mobile/app/` and `mobile/src/features/` — when in doubt, do what the Expo app does.
- API contract: `mobile/src/api/*.ts` + `mobile/src/api/schemas/*.ts`.
- Auth: `X-Client: mobile` header on every request; refresh token in the JSON body, sent back via `POST /auth/refresh`. See `mobile/src/api/client.ts`.
- Design tokens: `mobile/src/theme/colors.ts` + component styles in `mobile/src/components/`. System font (same as Expo).

## Network in dev and tests

- `BuildConfig.API_BASE_URL` defaults to Railway prod (like `mobile/src/api/config.ts`), overridable via `traccia.apiBaseUrl` in `apps/android/local.properties`.
- **Cloud sessions never call prod.** Tests use MockWebServer. Manual checks: local `be` (see `environment.yaml`) + emulator (`http://10.0.2.2:3005/api`).

## Verification (every PR)

```bash
cd apps/android
./gradlew lintDebug testDebugUnitTest assembleDebug
./gradlew verifyRoborazziDebug   # from N3 onwards
```

Every new screen gets at least: a ViewModel test (loading / data / error states) and a Roborazzi screenshot. Generated screenshots are attached to the PR.

## Branch and commits

- Branch `feat/N<k>-android-<slug>` from up-to-date `main`.
- Conventional Commits with scope `android`: `feat(android): login screen`.
- One PR per card. No out-of-scope work.
- The closer adds a line to "What we did" in `WORKBOOK.md` and ticks the card in the plan's table.
