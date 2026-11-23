// Italian copy for the API `error` strings the coach can trigger. The contract keeps errors
// in English; the strings come from be/src/services/subscriptionValidation.ts,
// subscriptionAccess.ts, exerciseSetValidation.ts, routes/coachsubscriptions.ts and, for the
// meal plan (AL), mealPlanValidation.ts, mealTagAccess.ts, mealPlanTemplateAccess.ts and
// mealPlanAccess.ts (docs/contracts/al-piano-pasti.md).

const AMOUNT_RANGE = "L'importo deve essere tra 0 e 10.000 €.";
const PERIOD_RANGE = "La durata deve essere da 1 a 52 mesi o settimane.";
const INVALID_TEXT = "Il testo contiene un carattere non valido.";
// After a 404 or 409 on the meal plan save the page reloads the saved plan (contract).
const MEAL_PLAN_CHANGED_ELSEWHERE =
  "Il piano è cambiato in un'altra scheda: ecco la versione salvata. Rifai le modifiche e salva.";

const KNOWN_API_ERROR_MESSAGES: Record<string, string> = {
  "name is required": "Inserisci il nome.",
  "name must be at most 100 characters": "Il nome può avere al massimo 100 caratteri.",
  "name must not contain a NUL character": INVALID_TEXT,
  "note must not contain a NUL character": INVALID_TEXT,
  "priceCents must be an integer between 0 and 1000000": AMOUNT_RANGE,
  "agreedPriceCents must be an integer between 0 and 1000000": AMOUNT_RANGE,
  "amountCents must be an integer between 0 and 1000000": AMOUNT_RANGE,
  "periodUnit must be month or week": PERIOD_RANGE,
  "periodCount must be an integer between 1 and 52": PERIOD_RANGE,
  "Offer not found": "Offerta non trovata. Ricarica la pagina.",
  "offerId is required": "Scegli un'offerta.",
  "Offer is archived":
    "Questa offerta è archiviata: ripristinala nel listino o scegline un'altra.",
  "Subscription already exists":
    "L'abbonamento è appena stato creato altrove. Dati aggiornati.",
  "paidThrough must be on or after startedOn":
    "«Pagato fino al» non può essere prima dell'inizio.",
  "endedOn must be on or after startedOn": "La chiusura non può essere prima dell'inizio.",
  "paidThrough cannot be changed after creation":
    "«Pagato fino al» si sposta solo con pagamenti e pause.",
  "paidOn must not be in the future": "La data del pagamento non può essere nel futuro.",
  "periods must be an integer between 1 and 12": "Puoi registrare da 1 a 12 periodi.",
  "note must be at most 500 characters": "La nota può avere al massimo 500 caratteri.",
  "Payment would shorten the paid period":
    "Con questa partenza il periodo pagato si accorcerebbe: scegli l'altra.",
  "Resulting paidThrough is out of range": "La nuova scadenza andrebbe oltre il 2199.",
  "Subscription not found": "Il cliente non ha un abbonamento.",
  "Subscription has ended":
    "L'abbonamento è chiuso: riprendilo per registrare pagamenti o pause.",
  "Payment not found": "Pagamento non trovato: forse è già stato annullato.",
  "Only the latest payment can be undone": "Puoi annullare solo l'ultimo pagamento.",
  "Only the latest change can be undone":
    "Non si può annullare: dopo è stato registrato altro. Annulla prima l'ultima operazione.",
  "endsOn must be on or after startsOn":
    "La fine della pausa non può essere prima dell'inizio.",
  "startsOn must be at most 31 days ago": "La pausa può iniziare al massimo 31 giorni fa.",
  "Pause must be at most 180 days": "La pausa può durare al massimo 180 giorni.",
  "startsOn must be on or after startedOn": "La pausa non può iniziare prima dell'abbonamento.",
  "Subscription already has an active pause": "C'è già una pausa attiva.",
  "Pause overlaps another pause": "Le date si sovrappongono a una pausa già registrata.",
  "Pause has already ended": "La pausa è già finita.",
  "No active pause": "Nessuna pausa attiva.",
  "Client not found": "Questo cliente non è più collegato a te.",
  "setPrescriptions must have at most 30 sets": "Un esercizio può avere al massimo 30 serie.",
  "name must be at most 60 characters": "Il nome può avere al massimo 60 caratteri.",
  "Meal tag already exists": "C'è già un tag con questo nome.",
  "Too many meal tags": "Hai raggiunto il numero massimo di tag.",
  "Meal tag not found": "Questo tag non è più disponibile: elenco dei tag aggiornato.",
  "Too many meal plan templates": "Hai già 20 template: eliminane uno per crearne un altro.",
  "Meal plan template not found": "Questo template non c'è più: elenco aggiornato.",
  "meals must have at least 1 entry": "Aggiungi almeno un pasto.",
  "meals must have at most 12 entries": "Al massimo 12 pasti.",
  "meals.items must have at most 30 entries": "Un pasto può avere al massimo 30 alimenti.",
  "meals.items.food is required": "Scrivi il nome di ogni alimento.",
  "meals.items.food must be at most 120 characters":
    "Il nome di un alimento può avere al massimo 120 caratteri.",
  "meals.items.quantity must be at most 60 characters":
    "La quantità può avere al massimo 60 caratteri.",
  "notes must be at most 1000 characters": "Le note possono avere al massimo 1000 caratteri.",
  "meals.notes must be at most 500 characters":
    "Le note di un pasto possono avere al massimo 500 caratteri.",
  "meals.timeOfDay must be HH:MM or null": "Scrivi l'orario come 07:30, oppure lascialo vuoto.",
  "Meal not found": MEAL_PLAN_CHANGED_ELSEWHERE,
  "Meal item not found": MEAL_PLAN_CHANGED_ELSEWHERE,
  "Meal plan already exists": MEAL_PLAN_CHANGED_ELSEWHERE,
  "Meal plan not found": "Il piano non c'è più: pagina aggiornata.",
  "Request body too large":
    "Il piano è troppo lungo: accorcia note o alimenti e salva di nuovo.",
};

// These messages carry a field name or a list of values, so they match by pattern.
const KNOWN_API_ERROR_PATTERNS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /^(startedOn|paidThrough|endedOn|paidOn|startsOn|endsOn) must be YYYY-MM-DD( or null)?$/,
    message: "Data non valida (tra il 2000 e il 2099).",
  },
  { pattern: /^method must be one of /, message: "Scegli il metodo di pagamento." },
  { pattern: /^(notes|meals\.notes|meals\.items\.(food|quantity)) must not contain a NUL character$/, message: INVALID_TEXT },
];

/** The Italian copy for an API error string, or null when the string is not known. */
export function translateApiErrorMessage(message: string): string | null {
  const exactMatch = KNOWN_API_ERROR_MESSAGES[message];

  if (exactMatch !== undefined) {
    return exactMatch;
  }

  const patternMatch = KNOWN_API_ERROR_PATTERNS.find(({ pattern }) => pattern.test(message));

  return patternMatch?.message ?? null;
}
