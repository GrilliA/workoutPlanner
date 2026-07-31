# mobile/ — TRACCIA (Expo + React Native + TypeScript)

Client **nativo** dell’app. Non è un WebView: è React Native con Expo.
Il client web resta in [`../fe`](../fe). L’API resta in [`../be`](../be).

---

## Perché esiste questa cartella (e non sta dentro `fe/`)

| | `fe/` (web) | `mobile/` (questo) |
| --- | --- | --- |
| UI | DOM + CSS | `View` / `Text` + `StyleSheet` |
| Bundler | Vite | Metro (Expo) |
| Navigazione | wouter | Expo Router (file in `app/`) |
| Sessione lunga | cookie httpOnly | SecureStore + body refresh |
| Shell | browser | iOS / Android nativi |

Mischiare RN dentro `fe/` mescolerebbe due toolchain. Per questo è una sibling folder.

---

## Glossario web → React Native

| Concetto web (`fe/`) | Equivalente qui |
| --- | --- |
| `<div>` | `<View>` |
| `<span>` / `<p>` | `<Text>` (il testo **deve** stare in `Text`) |
| `<input>` | `<TextInput>` |
| `<button>` / click | `<Pressable>` + `onPress` |
| CSS / `style.css` | `StyleSheet.create({ ... })` |
| `className` | `style={styles.foo}` |
| Vite `import.meta.env.VITE_*` | `process.env.EXPO_PUBLIC_*` |
| Proxy `/api` in dev | URL assoluto (`EXPO_PUBLIC_API_URL`) |
| `localStorage` / cookie | `expo-secure-store` (refresh) + memoria (access JWT) |
| Capacitor plugins | Moduli Expo (`expo-notifications`, `expo-haptics`, …) |

React (hooks, componenti funzione, stato) è lo stesso. Cambia il “DOM”.

---

## Come avviare

Prerequisiti: **Node ≥ 22**, backend su porta `3005`, Postgres up.

```bash
# terminale 1 — API
cd be && npm run dev

# terminale 2 — app
cd mobile
cp .env.example .env   # se non c’è già
npm start              # Expo Dev Tools
```

Poi:
- **iOS Simulator**: premi `i` (macOS + Xcode)
- **Android Emulator**: premi `a`
- **Device fisico**: Expo Go + stesso Wi‑Fi; in `.env` metti l’IP LAN della macchina, es. `EXPO_PUBLIC_API_URL=http://192.168.1.20:3005/api` (non `127.0.0.1` sul telefono)

Typecheck:

```bash
cd mobile && npm run typecheck
```

---

## Mappa cartelle

```
mobile/
├── app/                 # Expo Router — ogni file = una route
│   ├── index.tsx        # redirect login ↔ app
│   ├── (auth)/          # login, register (gruppo senza tab)
│   ├── (app)/           # tab: Oggi, Programmi, Progressi, Account
│   └── session/[id].tsx # sessione attiva / recap
├── src/
│   ├── api/             # client HTTP + Zod (portati da fe, adattati al mobile)
│   ├── auth/            # AuthProvider + SecureStore
│   ├── features/        # logica per feature (es. rest timer)
│   ├── components/      # UI primitives RN
│   └── theme/           # colori / spacing
├── app.json             # config Expo (nome, bundle id, plugin)
├── .env.example         # EXPO_PUBLIC_API_URL
└── README.md            # questo file
```

**`app/` vs `src/`:** le route vivono in `app/` (convenzione Expo Router). La logica riusabile sta in `src/`.

---

## Auth: perché è diversa dal web

Sul web il refresh token è un **cookie httpOnly**: il browser lo manda da solo.

Su React Native **non c’è** quel cookie jar. Quindi:

1. Il mobile manda l’header `X-Client: mobile`
2. Il backend, oltre al cookie (per il web), mette `refreshToken` nel JSON
3. L’app salva il refresh in **SecureStore** (Keychain / Keystore)
4. Al boot: legge SecureStore → `POST /auth/refresh` con body `{ refreshToken }` → nuovo access token in memoria

Senza questo pezzo, chiudendo l’app perderesti la sessione.

---

## Cosa abbiamo fatto / Perché

### 2026-07-31 — Sessione Focus mode

- **Cosa:** un esercizio alla volta (pager Prec/Succ), kg/reps stepper sempre visibili, chip serie, timer recupero sotto il focus, header con progresso e durata.
- **Perché:** la lista piatta nascondeva i kg dietro un toggle e rendeva la sessione poco moderna.

### 2026-07-31 — Rest timer visibile in background

- **Cosa:** all’avvio recupero notifica sticky “Recupero in corso · termina alle HH:MM”; a fine resta l’alert “Recupero finito”; cancel/skip rimuove entrambe. Channel Android `rest-timer`.
- **Perché:** in background il tick JS non aggiorna la UI; la shade mostra almeno durata/fine senza Live Activity / foreground service.

### 2026-07-21 — Scaffold Expo TypeScript in `mobile/`

- **Cosa:** app Expo Router + TypeScript strict, tema dark TRACCIA, tab principali.
- **Perché:** lasciare Capacitor (WebView) e avere un client nativo vero, senza mischiarlo a Vite.

### 2026-07-21 — Auth dual (cookie web + body mobile)

- **Cosa:** BE accetta refresh da cookie *oppure* body; con `X-Client: mobile` restituisce `refreshToken` nel JSON. Mobile usa SecureStore.
- **Perché:** stesso endpoint per due client; zero breaking change sul web.

### 2026-07-21 — API client + schermate verticali

- **Cosa:** portati Zod schemas + `apiRequest`; schermate Login, Home (oggi + avvia), Programmi, Progressi, Account, Sessione con log set + rest timer (notifiche/haptics Expo).
- **Perché:** riusare i contratti BE già pronti; UI riscritta in RN (CSS web non è riusabile).

### 2026-07-21 — Rimosso Capacitor da `fe/`

- **Cosa:** eliminati `fe/ios`, `fe/android`, dipendenze `@capacitor/*`; rest timer web = beep/vibrate.
- **Perché:** il path nativo è `mobile/`; mantenere Capacitor avrebbe significato due shell native da curare.

### Non fatto (di proposito)

- **`packages/shared` monorepo:** per ora i schema sono copiati in `mobile/src/api`. Si estrae solo se web e mobile divergono o la copia diventa dolorosa.
- **Editor programmi completo su mobile:** lista ok; create/edit resta sul web per ora.
- **Pixel-perfect vs Figma web:** UI funzionale, non clone CSS.

---

## Branch di riferimento

Lavoro iniziale: `feat/mobile-expo-scaffold`.
