# Waitlist

Tutto il comportamento della lista d'attesa sta in questa cartella. Per cambiarlo non serve aprire il resto del backend.

Il montaggio, fuori da qui, è solo il collegamento:

- `src/app.ts` monta il router su `/api/waitlist` (prima del parser JSON condiviso) e fa trust del proxy Railway, così il limite è per visitatore
- `src/db/schema/index.ts` riesporta `schema.ts` perché Drizzle generi e migri la tabella

`POST /api/waitlist` accetta JSON:

| Campo | Regola |
| --- | --- |
| `email` | obbligatoria, trim + minuscolo |
| `role` | `coach` o `athlete` |
| `consent` | deve essere vero (`true`, `"true"`, `"yes"`, `"on"`) |
| `ref` | facoltativo, lettere/cifre/`_`/`-`, max 80 |
| `company` | honeypot: se è pieno rispondiamo `{ "ok": true }` e non salviamo niente |

Email già presente: stessa risposta di successo, nessuna seconda mail. Non diciamo se l'indirizzo c'era già.

In tabella finiscono solo email, ruolo, `ref`, istante del consenso, `created_at` e `welcome_sent_at` (null finché la mail di benvenuto non parte).

## Mail

Se `SMTP_HOST` o `SMTP_FROM` mancano, l'iscrizione si salva e il processo logga un warning. Non fallisce la richiesta.

Con SMTP configurato, a ogni nuova iscrizione:

1. mail di benvenuto in italiano allo iscritto (HTML tema Sole + testo, riga privacy con TODO)
2. avviso a `WAITLIST_NOTIFY_TO`, se è impostato

## Env

Vedi `be/.env.example`. Nessun segreto nel repo.

| Variabile | Uso |
| --- | --- |
| `SMTP_HOST` | es. `smtp.gmail.com` |
| `SMTP_PORT` | `587` (default) o `465` |
| `SMTP_USER` | indirizzo Gmail |
| `SMTP_PASS` | app password, non la password dell'account |
| `SMTP_FROM` | es. `Traccia <traccia@gmail.com>` |
| `WAITLIST_NOTIFY_TO` | dove arriva l'avviso di ogni nuova iscrizione |
| `WAITLIST_CORS_ORIGINS` | facoltativa. Se è vuota vale solo `https://grillia.github.io`. Se è impostata, sostituisce quel default (lista separata da virgole) |

Il limite è 8 richieste per IP ogni 15 minuti. Il body massimo è 2kb.

## Checklist per metterla online

L'API pubblica è `https://workoutplanner-production-974a.up.railway.app` (la stessa di `mobile/src/api/config.ts`). Il form punta a `https://workoutplanner-production-974a.up.railway.app/api/waitlist`.

Le migrazioni non partono da sole all'avvio del processo.

1. Dopo il merge, sul servizio Railway dell'API aggiungi le variabili (non committarle):
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = l'indirizzo Gmail che spedisce
   - `SMTP_PASS` = app password di Google (account → Sicurezza → Verifica in due passaggi → Password per le app). Non usare la password di login.
   - `SMTP_FROM` = `Traccia <quell'indirizzo Gmail>`
   - `WAITLIST_NOTIFY_TO` = l'indirizzo che deve ricevere l'avviso (può essere lo stesso Gmail)
   - `WAITLIST_CORS_ORIGINS` solo se serve un'origine in più. In produzione lasciala vuota: il default è `https://grillia.github.io`.
2. Controlla che Railway abbia ridistribuito il servizio da `main` (il codice nuovo deve essere in esecuzione prima del form).
3. Applica la migrazione sul database di produzione, una volta. Dalla cartella `be/`, con la CLI collegata a quel servizio: `railway run npm run db:migrate`. In alternativa, una shell del servizio con `DATABASE_URL` già presente ed `npm run db:migrate`.
4. Su GitHub: Settings → Secrets and variables → Actions → Variables → `PUBLIC_WAITLIST_ENDPOINT` = `https://workoutplanner-production-974a.up.railway.app/api/waitlist`. Non è un secret.
5. Actions → Deploy GitHub Pages → Run workflow su `main`, così la landing viene ricostruita con quell'indirizzo. Se la variabile è vuota, il workflow usa comunque lo stesso URL Railway.
