import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Offer } from "../../../../api/schemas/subscription.ts";
import {
  EMPTY_OFFER_DRAFT,
  draftFromOffer,
  offerChanges,
  validateOfferDraft,
} from "./offerDraft.ts";

const savedOffer: Offer = {
  id: 3,
  name: "Coaching mensile",
  priceCents: 8000,
  periodUnit: "month",
  periodCount: 1,
  isRecurring: true,
  archivedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("validateOfferDraft", () => {
  it("builds the request from a valid draft, trimming the name", () => {
    assert.deepEqual(
      validateOfferDraft({ ...EMPTY_OFFER_DRAFT, name: "  Trimestrale ", priceText: "199,90", periodCountText: "3" }),
      {
        ok: true,
        value: {
          name: "Trimestrale",
          priceCents: 19_990,
          periodUnit: "month",
          periodCount: 3,
          isRecurring: true,
        },
      },
    );
  });

  it("reports every invalid field at once", () => {
    const result = validateOfferDraft({
      ...EMPTY_OFFER_DRAFT,
      name: "   ",
      priceText: "1.000,00",
      periodCountText: "53",
    });

    assert.deepEqual(result, {
      ok: false,
      errors: {
        name: "Inserisci il nome dell'offerta.",
        price: "Scrivi l'importo in euro, con al massimo 2 decimali (es. 80 o 80,50).",
        periodCount: "La durata deve essere da 1 a 52 mesi o settimane.",
      },
    });
  });

  it("refuses a name over 100 characters and a price over 10.000 €", () => {
    const result = validateOfferDraft({
      ...EMPTY_OFFER_DRAFT,
      name: "a".repeat(101),
      priceText: "10000,50",
    });

    assert.equal(result.ok ? null : result.errors.name, "Il nome può avere al massimo 100 caratteri.");
    assert.equal(result.ok ? null : result.errors.price, "L'importo deve essere tra 0 e 10.000 €.");
  });

  it("refuses a duration that is not a whole number from 1 to 52", () => {
    const durationError = (periodCountText: string) => {
      const result = validateOfferDraft({ ...EMPTY_OFFER_DRAFT, name: "A", priceText: "1", periodCountText });
      return result.ok ? null : result.errors.periodCount;
    };

    assert.equal(durationError("0") !== null, true);
    assert.equal(durationError("1,5") !== null, true);
    assert.equal(durationError("") !== null, true);
    assert.equal(durationError("52"), null);
  });
});

describe("validateOfferDraft at the edges", () => {
  const valid = (changes: Partial<typeof EMPTY_OFFER_DRAFT>) =>
    validateOfferDraft({ ...EMPTY_OFFER_DRAFT, name: "Offerta", priceText: "80", ...changes });

  it("accepts a free offer (0 €) and the 10.000 € cap", () => {
    const free = valid({ priceText: "0" });
    const top = valid({ priceText: "10000,00" });

    assert.equal(free.ok ? free.value.priceCents : null, 0);
    assert.equal(top.ok ? top.value.priceCents : null, 1_000_000);
  });

  it("refuses a price with a thousands separator", () => {
    const result = valid({ priceText: "10.000" });

    assert.equal(
      result.ok ? null : result.errors.price,
      "Scrivi l'importo in euro, con al massimo 2 decimali (es. 80 o 80,50).",
    );
  });

  it("accepts a name of exactly 100 characters after the trim", () => {
    const result = valid({ name: ` ${"a".repeat(100)} ` });

    assert.equal(result.ok ? result.value.name.length : null, 100);
  });

  it("refuses a NUL character, as the API does", () => {
    const result = valid({ name: "Coaching\0mensile" });

    assert.equal(result.ok ? null : result.errors.name, "Il testo contiene un carattere non valido.");
  });

  it("reads a duration with spaces or a leading zero, and keeps 1 and 52", () => {
    const counts = [" 12 ", "01", "1", "52"].map((periodCountText) => {
      const result = valid({ periodCountText });
      return result.ok ? result.value.periodCount : null;
    });

    assert.deepEqual(counts, [12, 1, 1, 52]);
  });

  it("sends a one-off offer in weeks", () => {
    const result = valid({ periodUnit: "week", periodCountText: "12", isRecurring: false });

    assert.deepEqual(result.ok ? result.value : null, {
      name: "Offerta",
      priceCents: 8000,
      periodUnit: "week",
      periodCount: 12,
      isRecurring: false,
    });
  });
});

describe("offerChanges", () => {
  it("is empty when the form is unchanged", () => {
    const result = validateOfferDraft(draftFromOffer(savedOffer));

    assert.deepEqual(result.ok ? offerChanges(savedOffer, result.value) : null, {});
  });

  it("ignores spaces added around the same name", () => {
    const result = validateOfferDraft({ ...draftFromOffer(savedOffer), name: `  ${savedOffer.name}  ` });

    assert.deepEqual(result.ok ? offerChanges(savedOffer, result.value) : null, {});
  });

  it("sends only the unit when only the unit changes", () => {
    const result = validateOfferDraft({ ...draftFromOffer(savedOffer), periodUnit: "week" });

    assert.deepEqual(result.ok ? offerChanges(savedOffer, result.value) : null, { periodUnit: "week" });
  });

  it("edits an archived offer like any other, without touching `archived`", () => {
    const archived = { ...savedOffer, archivedAt: "2026-10-01T00:00:00.000Z" };
    const result = validateOfferDraft({ ...draftFromOffer(archived), priceText: "85,50" });

    assert.deepEqual(result.ok ? offerChanges(archived, result.value) : null, { priceCents: 8550 });
  });

  it("keeps only the changed fields", () => {
    const result = validateOfferDraft({
      ...draftFromOffer(savedOffer),
      priceText: "90",
      isRecurring: false,
    });

    assert.deepEqual(result.ok ? offerChanges(savedOffer, result.value) : null, {
      priceCents: 9000,
      isRecurring: false,
    });
  });
});
