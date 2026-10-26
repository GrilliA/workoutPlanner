import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { translateApiErrorMessage } from "./knownErrorMessages.ts";

describe("translateApiErrorMessage", () => {
  it("translates an exact backend string", () => {
    assert.equal(
      translateApiErrorMessage("Only the latest payment can be undone"),
      "Puoi annullare solo l'ultimo pagamento.",
    );
    assert.equal(
      translateApiErrorMessage("Client not found"),
      "Questo cliente non è più collegato a te.",
    );
  });

  it("gives the same copy to every money field", () => {
    const amountCopy = "L'importo deve essere tra 0 e 10.000 €.";

    assert.equal(
      translateApiErrorMessage("priceCents must be an integer between 0 and 1000000"),
      amountCopy,
    );
    assert.equal(
      translateApiErrorMessage("agreedPriceCents must be an integer between 0 and 1000000"),
      amountCopy,
    );
    assert.equal(
      translateApiErrorMessage("amountCents must be an integer between 0 and 1000000"),
      amountCopy,
    );
  });

  it("matches the date errors of any field, also the nullable one", () => {
    const dateCopy = "Data non valida (tra il 2000 e il 2099).";

    assert.equal(translateApiErrorMessage("paidOn must be YYYY-MM-DD"), dateCopy);
    assert.equal(translateApiErrorMessage("startsOn must be YYYY-MM-DD"), dateCopy);
    assert.equal(translateApiErrorMessage("endedOn must be YYYY-MM-DD or null"), dateCopy);
  });

  it("matches the method error whatever the list of methods", () => {
    assert.equal(
      translateApiErrorMessage("method must be one of cash, bank_transfer, satispay, paypal, other"),
      "Scegli il metodo di pagamento.",
    );
  });

  // Every `error` the subscription routes can send after a coach action, copied from
  // be/src/services/subscriptionValidation.ts, subscriptionAccess.ts, subscription.ts.
  it("translates every subscription error the coach can trigger", () => {
    const expected: [string, string][] = [
      ["name is required", "Inserisci il nome."],
      ["name must not contain a NUL character", "Il testo contiene un carattere non valido."],
      ["note must not contain a NUL character", "Il testo contiene un carattere non valido."],
      ["name must be at most 100 characters", "Il nome può avere al massimo 100 caratteri."],
      ["periodUnit must be month or week", "La durata deve essere da 1 a 52 mesi o settimane."],
      ["periodCount must be an integer between 1 and 52", "La durata deve essere da 1 a 52 mesi o settimane."],
      ["Offer not found", "Offerta non trovata. Ricarica la pagina."],
      ["offerId is required", "Scegli un'offerta."],
      ["Offer is archived", "Questa offerta è archiviata: ripristinala nel listino o scegline un'altra."],
      ["Subscription already exists", "L'abbonamento è appena stato creato altrove. Dati aggiornati."],
      ["startedOn must be YYYY-MM-DD", "Data non valida (tra il 2000 e il 2099)."],
      ["paidThrough must be YYYY-MM-DD", "Data non valida (tra il 2000 e il 2099)."],
      ["endsOn must be YYYY-MM-DD", "Data non valida (tra il 2000 e il 2099)."],
      ["paidThrough must be on or after startedOn", "«Pagato fino al» non può essere prima dell'inizio."],
      ["endedOn must be on or after startedOn", "La chiusura non può essere prima dell'inizio."],
      ["paidThrough cannot be changed after creation", "«Pagato fino al» si sposta solo con pagamenti e pause."],
      ["paidOn must not be in the future", "La data del pagamento non può essere nel futuro."],
      ["periods must be an integer between 1 and 12", "Puoi registrare da 1 a 12 periodi."],
      ["note must be at most 500 characters", "La nota può avere al massimo 500 caratteri."],
      ["Payment would shorten the paid period", "Con questa partenza il periodo pagato si accorcerebbe: scegli l'altra."],
      ["Resulting paidThrough is out of range", "La nuova scadenza andrebbe oltre il 2199."],
      ["Subscription not found", "Il cliente non ha un abbonamento."],
      ["Subscription has ended", "L'abbonamento è chiuso: riprendilo per registrare pagamenti o pause."],
      ["Payment not found", "Pagamento non trovato: forse è già stato annullato."],
      [
        "Only the latest change can be undone",
        "Non si può annullare: dopo è stato registrato altro. Annulla prima l'ultima operazione.",
      ],
      ["endsOn must be on or after startsOn", "La fine della pausa non può essere prima dell'inizio."],
      ["startsOn must be at most 31 days ago", "La pausa può iniziare al massimo 31 giorni fa."],
      ["Pause must be at most 180 days", "La pausa può durare al massimo 180 giorni."],
      ["startsOn must be on or after startedOn", "La pausa non può iniziare prima dell'abbonamento."],
      ["Subscription already has an active pause", "C'è già una pausa attiva."],
      ["Pause overlaps another pause", "Le date si sovrappongono a una pausa già registrata."],
      ["Pause has already ended", "La pausa è già finita."],
      ["No active pause", "Nessuna pausa attiva."],
    ];

    assert.deepEqual(
      expected.map(([backendError]) => [backendError, translateApiErrorMessage(backendError)]),
      expected,
    );
  });

  // Decision 2026-10-26: a string outside the map stays in English, no fallback copy.
  it("leaves the errors a well-formed request never gets untranslated", () => {
    const untranslated = [
      "Invalid athlete id",
      "Invalid offer id",
      "Invalid payment id",
      "Invalid request body",
      "At least one field is required",
      "isRecurring must be a boolean",
      "archived must be a boolean",
      "start must be paid_through or paid_on",
      "note must be a string or null",
    ];

    assert.deepEqual(
      untranslated.map((backendError) => translateApiErrorMessage(backendError)),
      untranslated.map(() => null),
    );
  });

  it("does not match the date pattern inside a longer sentence", () => {
    assert.equal(translateApiErrorMessage("At least one of startsAt or expiresAt must be YYYY-MM-DD"), null);
    assert.equal(translateApiErrorMessage("paidOn must be YYYY-MM-DD or later"), null);
  });

  it("matches only the date fields of the registry", () => {
    assert.equal(translateApiErrorMessage("startsAt must be YYYY-MM-DD"), null);
    assert.equal(translateApiErrorMessage("date must be YYYY-MM-DD"), null);
  });

  it("asks for a name without assuming it is an offer", () => {
    assert.equal(translateApiErrorMessage("name is required"), "Inserisci il nome.");
  });

  it("returns null for an unknown string", () => {
    assert.equal(translateApiErrorMessage("Email already registered"), null);
    assert.equal(translateApiErrorMessage("paidOn must be YYYY-MM-DD!"), null);
  });
});
