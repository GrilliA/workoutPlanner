# Contratto R8 — Pagina Business

Stato: **proposta** del 2026-11-13, da approvare (Contract Gate di R8). La definizione dei rinnovi a 90 giorni è **da confermare con l'utente** (vedi [Domande aperte](#domande-aperte)).
Piano: [`docs/plans/PT-registro.md`](../plans/PT-registro.md), logica pura 5 "Numeri business", R8. Contratti di riferimento: [`pt-registro.md`](pt-registro.md) (abbonamento, pagamenti, pausa, scollegamento), [`pt-oggi.md`](pt-oggi.md) (regole comuni).

Identificatori, route ed errori in inglese; le spiegazioni sono scritte per il PT, in italiano. Nessuna migrazione: i dati vengono da `client_subscriptions`, `subscription_payments` e `subscription_pauses`.

## Regole comuni

- La route sta sotto `/api/coach`, dietro `requireAuth` + `requireRole("coach")` (401 / 403 come le altre).
- "Oggi" è `todayInRome()`; ogni data è un giorno di calendario di Roma `YYYY-MM-DD`, ogni mese è `YYYY-MM`.
- Contano **tutti gli abbonamenti del coach**, anche quelli degli ex clienti scollegati: il loro abbonamento resta con `endedOn` (regola di `unlinkCoachAthlete`, [`pt-registro.md`](pt-registro.md#scollegamento-unlinkcoachathlete)). Un coach non vede mai gli abbonamenti né i pagamenti di un altro coach.
- Soldi in **centesimi interi**. Prezzo e periodo sono quelli **attuali** dell'abbonamento (`agreedPriceCents`, `periodUnit`, `periodCount`, `isRecurring`): dopo un cambio di offerta valgono i nuovi; i pagamenti già registrati restano con il loro importo.
- **Concluso** = `endedOn` impostato e `endedOn <= oggi` (`hasSubscriptionEnded`). Un `endedOn` futuro non è ancora concluso.
- **In pausa** = lo stato di `subscriptionState()` è `paused`, cioè c'è una pausa non annullata con `startsOn <= oggi <= endsOn`. Una pausa futura non conta ancora (ha già spostato `paidThrough`).
- La GET non scrive nulla.
- Errori: sempre `{ "error": string }` in inglese; la copy italiana sta nel client (`fe/src/api/knownErrorMessages.ts`).

## Endpoint

| Metodo | Path | Successo | Note |
| --- | --- | --- | --- |
| GET | `/coach/business?range=6m\|12m` | 200 `CoachBusiness` | nuova |

### Query `range`

| Valore | Mesi in `collectedByMonth` e `lostByMonth` |
| --- | --- |
| assente | come `6m` |
| `6m` | il mese in corso e i 5 precedenti |
| `12m` | il mese in corso e gli 11 precedenti |
| altro (anche ripetuto, `?range=6m&range=12m`) | 400 `"range must be 6m or 12m"` |

Altri parametri sono ignorati.

## Tipi di risposta

```ts
type BusinessRange = "6m" | "12m";

type CoachBusiness = {
  range: BusinessRange;
  today: string;                    // YYYY-MM-DD, il giorno di Roma usato in tutti i calcoli
  subscriptionCount: number;        // tutti gli abbonamenti del coach, anche conclusi: 0 = stato vuoto della pagina
  monthlyRecurringCents: number;    // entrate ricorrenti mensili
  recurringClientCount: number;     // abbonamenti che entrano in monthlyRecurringCents
  expectedNext30DaysCents: number;  // atteso nei prossimi 30 giorni
  collectedByMonth: { month: string; amountCents: number }[];  // dal più vecchio al mese in corso
  renewals90Days: { due: number; renewed: number };
  lostByMonth: { month: string; count: number }[];             // stessi mesi di collectedByMonth
};
```

Esempio (oggi = `2026-11-13`, `range=6m`; numeri di esempio):

```json
{
  "range": "6m",
  "today": "2026-11-13",
  "subscriptionCount": 3,
  "monthlyRecurringCents": 18833,
  "recurringClientCount": 2,
  "expectedNext30DaysCents": 8000,
  "collectedByMonth": [
    { "month": "2026-06", "amountCents": 0 },
    { "month": "2026-07", "amountCents": 8000 },
    { "month": "2026-08", "amountCents": 8000 },
    { "month": "2026-09", "amountCents": 38000 },
    { "month": "2026-10", "amountCents": 8000 },
    { "month": "2026-11", "amountCents": 0 }
  ],
  "renewals90Days": { "due": 4, "renewed": 3 },
  "lostByMonth": [
    { "month": "2026-06", "count": 0 },
    { "month": "2026-07", "count": 0 },
    { "month": "2026-08", "count": 0 },
    { "month": "2026-09", "count": 0 },
    { "month": "2026-10", "count": 1 },
    { "month": "2026-11", "count": 0 }
  ]
}
```

**Stato vuoto**: un coach senza abbonamenti riceve `subscriptionCount: 0`, tutti i numeri a 0 e i mesi del range con valore 0. Il client mostra lo stato vuoto da `subscriptionCount`, non dagli zeri (un coach con abbonamenti può avere zeri veri).

## Definizioni

### Entrate ricorrenti mensili — `monthlyRecurringCents`, `recurringClientCount`

> Quanto ti entra in un mese medio dai clienti con un abbonamento che si rinnova da solo.

Contano gli abbonamenti **ricorrenti** (`isRecurring`), **non conclusi** e **non in pausa**. Uno scaduto (il cliente non ha ancora pagato) conta: l'abbonamento è ancora in corso. Un pacchetto non ricorrente non conta.

Importo mensile di ogni abbonamento:

| Periodo | Formula | Esempio |
| --- | --- | --- |
| mesi | `agreedPriceCents / periodCount` | trimestrale da 210 € → 21000 / 3 = 7000 (70 €) |
| settimane | `agreedPriceCents × 52 / 12 / periodCount` | 12 settimane da 300 € → 30000 × 52 / 12 / 12 = 10833,33 → 10833 |

**Arrotondamento**: ogni importo mensile si arrotonda al centesimo intero più vicino (0,5 per eccesso, `Math.round`), poi si sommano gli importi arrotondati. `recurringClientCount` è il numero di abbonamenti sommati.

### Atteso nei prossimi 30 giorni — `expectedNext30DaysCents`

> Quanto dovrebbero pagarti i clienti con un rinnovo in arrivo da oggi ai prossimi 30 giorni.

Finestra: da **oggi compreso** a oggi + 29 (30 giorni di calendario).
Contano gli abbonamenti **ricorrenti**, **non conclusi**, **non in pausa** e **non scaduti** (`paidThrough >= oggi`). Gli scaduti non entrano: il pagamento è già in ritardo e lo segnala Oggi.

Per ogni abbonamento le date di rinnovo sono `paidThrough`, poi `paidThrough` + 1 periodo, + 2 periodi… (mesi al `billingDay` come `addPeriods`, settimane in giorni). Ogni data nella finestra vale `agreedPriceCents`; un settimanale da 1 settimana può quindi pagare 4 o 5 volte. Con un `endedOn` futuro le date da `endedOn` in poi non contano.

### Incassato per mese — `collectedByMonth`

> Quanto hai segnato come pagato in ogni mese.

Somma di `subscription_payments.amountCents` per mese di `paidOn`. Un elemento per **ogni** mese del range, anche a 0, dal più vecchio al **mese in corso compreso** (l'ultimo elemento). Un pagamento annullato (DELETE) non esiste più e non conta. Contano anche i pagamenti degli ex clienti e degli abbonamenti conclusi.

### Rinnovi negli ultimi 90 giorni — `renewals90Days` (da confermare)

> Delle scadenze arrivate negli ultimi 90 giorni, quante il cliente ha pagato.

Finestra: da oggi − 89 a oggi (90 giorni, oggi compreso). Solo abbonamenti **ricorrenti** (tipo attuale).

- **Rinnovato** (`renewed`): un pagamento che **non è il primo** dell'abbonamento, cioè arrivato quando c'era già un periodo pagato (`previousPaidThrough > startedOn`; sulle righe senza `previousPaidThrough`, scritte prima di `0015`, vale `coversFrom > startedOn`), con inizio copertura `coversFrom` nella finestra. Un pagamento di più periodi conta una volta.
- **Mancato**: un abbonamento con `paidThrough` nella finestra ma **prima di oggi**, cioè scaduto e non ancora pagato. Chi scade oggi non è ancora in ritardo. Conta anche chi ha smesso (concluso) senza rinnovare.
- `due = renewed + mancati`. Il client mostra `renewed` su `due` (e la percentuale); con `due = 0` nessuna percentuale.

Le pause sono escluse da sole: una pausa in corso sposta `paidThrough` oltre la fine della pausa, quindi l'abbonamento non è mai "mancato" mentre è in pausa; il pagamento dopo la pausa parte dalla data spostata.

### Clienti persi per mese — `lostByMonth`

> Quanti clienti hanno smesso in ogni mese.

Numero di abbonamenti con `endedOn` nel mese e `endedOn <= oggi` (un `endedOn` futuro non è ancora una perdita). Stessi mesi di `collectedByMonth`, anche a 0. Lo scollegamento di un cliente imposta `endedOn` a oggi, quindi gli ex clienti scollegati contano qui.

## Logica pura (`be/src/services/coachBusiness.ts`)

Tutte le formule sopra sono funzioni pure con unit test in `coachBusiness.test.ts`: importo mensile (mensile, trimestrale, 12 settimane), esclusione di pausa e concluso, cambio di offerta, date di rinnovo nella finestra, mesi del range (anche a cavallo d'anno), mese senza incassi, rinnovi e mancati, persi.

## Query (numero fisso per richiesta)

Tre letture, filtrate per `client_subscriptions.coach_id`:

1. Abbonamenti del coach (tutti).
2. Pause in corso oggi (non annullate, `starts_on <= oggi <= ends_on`) degli abbonamenti del coach.
3. Pagamenti degli abbonamenti del coach con `paid_on` dal primo giorno del range **oppure** `covers_from` dall'inizio della finestra dei rinnovi. Usa `subscription_payments_subscription_id_idx`.

Nessuna migrazione: un coach ha qualche decina di abbonamenti.

## Sicurezza e permessi

- Ogni lettura filtra per il coach autenticato; nessun id nella route.
- La risposta contiene solo somme e conteggi: niente nomi, email o id di clienti.
- Atleta → 403, senza token → 401.

## Impatto per pacchetto

| Pacchetto | Cambio |
| --- | --- |
| `be/` | `services/coachBusiness.ts` (+ test), `services/coachBusinessAccess.ts`, `routes/coachbusiness.ts` montata in `routes/coach.ts`, e2e `e2e/business.e2e.test.ts` |
| `fe/` | `api/schemas/business.ts`, `api/business.ts`, pagina `pages/coach/business/`, route `/business`, voce "Business" in `AppShell`, copy dell'errore in `knownErrorMessages.ts` |
| `mobile/` | nessuno |

## Retrocompatibilità e rilascio

Route nuova, nessun campo cambiato altrove. Rilascio: BE → pannello. Rollback: pannello, poi BE.

## Nomi scelti

| Nome | Alternativa scartata | Perché |
| --- | --- | --- |
| `recurringClientCount` | `activeClientCount` (piano) | conta solo gli abbonamenti sommati nelle entrate ricorrenti; "attivi" farebbe pensare a tutti i clienti collegati |
| `subscriptionCount` | `hasSubscriptions: boolean` | serve allo stato vuoto e resta utile come numero |
| `coachBusinessAccess.ts` | query dentro `coachBusiness.ts` | come `coachTodayAccess.ts`: la logica pura resta senza I/O |

## Domande aperte

1. **Rinnovi a 90 giorni**: confermare la definizione sopra (scadenze pagate / scadenze arrivate, contate per pagamento e per abbonamento scaduto). Alternativa più grossolana: contare gli abbonamenti, non le scadenze.
2. **Finestra dell'atteso**: il piano diceva `paidThrough` in (oggi, oggi + 30]; qui è [oggi, oggi + 29] perché chi scade oggi deve ancora pagare e altrimenti non comparirebbe da nessuna parte.
