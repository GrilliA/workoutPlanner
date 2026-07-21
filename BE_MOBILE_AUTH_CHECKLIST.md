# Checklist backend — auth mobile + deploy Railway

Usa questo file **prima** di push/redeploy. Spunta i punti dopo averli verificati tu.

API online oggi: `https://workoutplanner-production-974a.up.railway.app`

---

## 0. Contesto (letto una volta)

| Cosa | Stato attuale |
| --- | --- |
| Codice mobile (`X-Client: mobile` + `refreshToken` nel JSON) | Solo sul branch locale `feat/mobile-expo-scaffold` (diff in `be/`) |
| Railway deployato | **BE vecchio** — register/login mobile **non** restituiscono `refreshToken` nel body |
| Web (cookie httpOnly) | Deve restare invariato (nessun `refreshToken` nel JSON senza header mobile) |
| Test unit BE | `npm test` in `be/` → **20 pass** (nessun test dedicato auth mobile) |
| Typecheck BE | `tsc --noEmit` ok sul branch |

File toccati dal fix mobile:

- `be/src/routes/auth.ts`
- `be/src/services/refreshToken.ts`
- `be/src/middleware/cors.ts` (header `X-Client` in CORS)

---

## 1. Cosa deve fare il BE (contratto)

Con header `X-Client: mobile`:

- [ ] `POST /api/auth/register` → `201` + JSON con `user`, `accessToken`, **`refreshToken`**
- [ ] `POST /api/auth/login` → `200` + JSON con `user`, `accessToken`, **`refreshToken`**
- [ ] `POST /api/auth/refresh` body `{ "refreshToken": "..." }` → `200` + `accessToken` + nuovo `refreshToken` (rotate)
- [ ] `POST /api/auth/logout` body `{ "refreshToken": "..." }` → `204`
- [ ] `PATCH /api/auth/password` (authed + mobile) → `200` + `{ refreshToken }` (non solo `204`)

Senza `X-Client: mobile` (client web):

- [ ] login/register → **solo** `accessToken` (niente `refreshToken` nel body)
- [ ] refresh via **cookie** `refresh_token` (path `/api/auth`)
- [ ] change password → `204` come prima

---

## 2. Verifica su Railway **prima** del redeploy (baseline — deve fallire il pezzo mobile)

Da terminale:

```bash
API=https://workoutplanner-production-974a.up.railway.app

# Root
curl -sS -w "\nHTTP %{http_code}\n" "$API/"

# Register mobile — OGGI ti aspetti accessToken ma NON refreshToken
EMAIL="check-$(date +%s)@example.com"
curl -sS -X POST "$API/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Client: mobile" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123!\",\"name\":\"Check\"}"
```

- [ ] Root → `200` + testo API
- [ ] Register → `201` + `accessToken`
- [ ] Register → **manca** `refreshToken` (conferma che il deploy è ancora vecchio)

---

## 3. Verifica **locale** col codice nuovo (prima di push)

Avvia BE locale contro Neon (o Postgres locale) con le stesse env di produzione dove ha senso:

```bash
cd be
# DATABASE_URL=... JWT_ACCESS_SECRET=... NODE_ENV=development
npm run dev
```

Poi:

```bash
API=http://127.0.0.1:3005

EMAIL="local-mobile-$(date +%s)@example.com"
RESP=$(curl -sS -X POST "$API/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Client: mobile" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123!\",\"name\":\"Local\"}")
echo "$RESP"
```

- [ ] JSON contiene `refreshToken` (stringa non vuota)
- [ ] Stesso register **senza** `X-Client: mobile` → **niente** `refreshToken` nel body
- [ ] Prendi `refreshToken` dalla risposta e:

```bash
# sostituisci TOKEN
curl -sS -X POST "$API/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-Client: mobile" \
  -d '{"refreshToken":"TOKEN"}'
```

- [ ] `200` + nuovo `accessToken` + nuovo `refreshToken`
- [ ] Secondo refresh col **vecchio** token → `401` (rotate invalida il precedente)

Web cookie smoke (opzionale ma utile):

```bash
# login senza X-Client, salva cookie jar
curl -sS -c /tmp/wp-cookies -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123!\"}"
curl -sS -b /tmp/wp-cookies -X POST "$API/api/auth/refresh" \
  -H "Accept: application/json"
```

- [ ] Refresh via cookie → `200` + `accessToken` senza obbligo di `refreshToken` nel body

---

## 4. Env Railway da controllare in dashboard

- [ ] `DATABASE_URL` = Neon (`sslmode=require`) — password aggiornata se l’hai ruotata
- [ ] `JWT_ACCESS_SECRET` = set (non default / non vuoto)
- [ ] `NODE_ENV=production`
- [ ] `NPM_CONFIG_PRODUCTION=false` (finché `start` usa `ts-node`)
- [ ] `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES_DAYS`, `BCRYPT_ROUNDS` ok
- [ ] Root Directory servizio = `be`
- [ ] Dominio pubblico ancora: `workoutplanner-production-974a.up.railway.app`

---

## 5. Rischi / cose da tenere d’occhio (non bloccanti al primo deploy)

- [ ] Cookie refresh resta `SameSite=Lax` + `Secure` in production — ok per web same-site; mobile **non** dipende dal cookie (usa body + SecureStore)
- [ ] Il refresh token finisce nel JSON solo se `X-Client: mobile` — non esporre quel header da pagine web non fidate in modo banale (è un client hint, non un segreto)
- [ ] Nessuna migration nuova per questo pezzo (solo logica auth)
- [ ] CORS: React Native di solito non manda `Origin` come il browser; Expo web sì — se usi Expo web, potresti dover aggiungere l’origine in `CORS_ORIGINS`

---

## 6. Dopo redeploy Railway (ripeti i curl della sezione 2)

- [ ] Register con `X-Client: mobile` → body include **`refreshToken`**
- [ ] Refresh con body → nuovo pair di token
- [ ] Register/login **senza** header mobile → **niente** `refreshToken` nel body
- [ ] Expo Go: login → chiudi app → riapri → sessione ripristinata (SecureStore + refresh)

---

## 7. Gate “procedi al push”

Segna OK solo se:

- [ ] Sezione 3 (locale col codice nuovo) tutta verde
- [ ] Sezione 4 (env Railway) controllata
- [ ] Hai chiaro che il push deve includere almeno i 3 file `be/` sopra (non serve pushare tutto `mobile/` per sbloccare Railway, ma il BE sì)

Quando hai spuntato il gate, dimmi **procedi col deploy** e facciamo commit BE + push / istruzioni Railway.
