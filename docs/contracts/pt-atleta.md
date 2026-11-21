# Contratto R6 — Stato coaching dell'atleta (Home e Account mobile)

Stato: **proposta R6**, da approvare in review. Decisione già presa dall'utente il 2026-11-13: abbonamento `ended` con il coach ancora collegato → `status: "ended"` e riga "Coaching concluso".
Piano: [`docs/plans/PT-registro.md`](../plans/PT-registro.md), riga R6 e riga `GET /athlete/home`. Contratto di riferimento: [`pt-registro.md`](pt-registro.md) (`SubscriptionStatus`, `SubscriptionState`, pausa attiva).
Codice: logica pura `be/src/services/athleteCoaching.ts`, lettura `loadAthleteCoaching` in `be/src/services/athleteHome.ts`, route `be/src/routes/athlete.ts`.

Identificatori, route ed errori in inglese; i testi che vede l'atleta sono in italiano e vivono nel client mobile.

## Regole

- **Additivo**: `GET /athlete/home` e `GET /athlete/coach` aggiungono il campo `coaching`; tutti gli altri campi restano identici. Il mobile già pubblicato lo ignora (`z.object` scarta le chiavi sconosciute). Nessuna route nuova, nessuna migrazione, nessun errore nuovo.
- Le route restano dietro `requireAuth` + `requireRole("athlete")` (401 / 403 come oggi).
- **Filtro per coppia**: si legge solo l'abbonamento della coppia (coach collegato oggi, atleta). `client_subscriptions` è unica per coppia, non per atleta: un ex coach può avere ancora una riga per questo atleta, e quella riga non compare mai.
- **Stessa fonte del coach**: lo stato si legge con `loadSubscriptionDetail` (lo stesso dettaglio di `GET /coach/clients/:athleteId/subscription`), quindi con `subscriptionState()` e la pausa attiva come per il coach. Per la stessa coppia e lo stesso giorno (`todayInRome()`) coach e atleta vedono gli stessi `status`, `paidThrough`, `daysLeft` e `pausedUntil`.
- **Niente soldi**: nessun campo di prezzo, di offerta, di pagamento o di metodo. Niente id interni (`subscriptionId`, `offerId`, `coachId` della riga).

## Tipi

```ts
type AthleteCoachingStatus = "active" | "expiring" | "expired" | "paused" | "ended"; // = SubscriptionStatus

type AthleteCoaching = {
  coachName: string | null;     // users.name del coach collegato; null come `coach.name` in /athlete/coach
  status: AthleteCoachingStatus;
  paidThrough: string;          // YYYY-MM-DD, ultimo giorno pagato (incluso)
  daysLeft: number;             // giorni da oggi a paidThrough, negativo se scaduto (= SubscriptionState.daysLeft)
  pausedUntil: string | null;   // YYYY-MM-DD, solo con status "paused"; altrimenti null
};
```

## Endpoint

| Metodo | Path | Successo | Cambio |
| --- | --- | --- | --- |
| GET | `/athlete/home` | 200 `AthleteHome & { coaching: AthleteCoaching \| null }` | campo `coaching` in fondo |
| GET | `/athlete/coach` | 200 `{ coach: AthleteCoach \| null; coaching: AthleteCoaching \| null }` | campo `coaching` accanto a `coach` |

`AthleteCoach` resta `{ coachId, email, name, linkedAt }` come oggi. Le due route danno sempre lo stesso `coaching` per lo stesso atleta e lo stesso giorno.

## Quando `coaching` è `null`

1. L'atleta non ha un coach collegato.
2. Il coach collegato non ha un abbonamento per l'atleta (anche se un ex coach ne ha uno).

## Stati

| `status` | Quando (da `subscriptionState`) | `daysLeft` | `pausedUntil` |
| --- | --- | --- | --- |
| `active` | più di 7 giorni a `paidThrough` | `> 7` | `null` |
| `expiring` | da 0 a 7 giorni a `paidThrough` | `0..7` | `null` |
| `expired` | `paidThrough` passato | `< 0` | `null` |
| `paused` | una pausa non annullata è in corso oggi | come sopra, conta da oggi a `paidThrough` già spostato | fine della pausa |
| `ended` | `endedOn <= oggi`, anche con il coach ancora collegato (il coach ha chiuso l'abbonamento) | come sopra, non usato dal client | `null` |

Un abbonamento che inizia nel futuro ed è già "chiuso" con `endedOn` futuro resta nello stato calcolato dalle date fino a quel giorno, come per il coach.

## Esempio

```json
{
  "coach": { "coachId": 12, "email": "luca@example.com", "name": "Luca Rossi", "linkedAt": "2026-10-01T08:00:00.000Z" },
  "coaching": {
    "coachName": "Luca Rossi",
    "status": "expired",
    "paidThrough": "2026-11-10",
    "daysLeft": -3,
    "pausedUntil": null
  }
}
```

## Client mobile

- Schema Zod `athleteCoachingSchema` in `mobile/src/api/schemas/athletehome.ts`, riusato da `athleteCoachResponseSchema` in `mobile/src/api/athlete.ts`.
- **Via di fuga sugli stati nuovi**: il campo si legge con `.catch(null)`. Uno `status` che il client non conosce, o un `coaching` malformato o assente (backend precedente a R6), diventa `null`: la riga di stato sparisce e il resto della Home si carica.
- Testi (in `mobile/src/features/home/mappers/coachingLabels.ts`):

| `status` | Riga |
| --- | --- |
| `active` | "Coaching attivo · fino al {paidThrough, es. 12 dicembre}" |
| `expiring` | "Coaching in scadenza oggi" / "… domani" / "… tra N giorni" |
| `expired` | "Coaching da rinnovare · La scheda resta attiva" |
| `paused` | "Coaching in pausa · fino al {pausedUntil}" ("Coaching in pausa" se manca la data) |
| `ended` | "Coaching concluso" |

- Mai prezzi, mai pulsanti di pagamento: la riga è solo testo.

## Rilascio

Backend prima (nessuna migrazione), poi la build mobile. Rollback: revert del backend; il mobile R6 legge `coaching` assente come `null` e nasconde la riga.
