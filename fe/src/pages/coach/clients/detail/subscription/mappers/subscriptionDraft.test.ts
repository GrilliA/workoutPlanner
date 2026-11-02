import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Offer, Subscription } from "../../../../../../api/schemas/subscription.ts";
import type { Pause, Payment } from "../../../../../../api/schemas/subscription.ts";
import {
  doesChangeAdvanceRevision,
  draftFromSubscription,
  draftPriceText,
  draftWithOffer,
  hasUndoableChange,
  newSubscriptionDraft,
  offerChoices,
  subscriptionChanges,
  subscriptionInputForCreation,
  validateSubscriptionDraft,
} from "./subscriptionDraft.ts";

const offer = (
  id: number,
  priceCents: number,
  periodUnit: Offer["periodUnit"] = "month",
  archivedAt: string | null = null,
): Offer => ({
  id,
  name: `Offerta ${id}`,
  priceCents,
  periodUnit,
  periodCount: 1,
  isRecurring: true,
  archivedAt,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const offers = [
  offer(1, 8000),
  offer(2, 20000, "week"),
  offer(3, 5000, "month", "2026-09-01T00:00:00.000Z"),
];

const saved: Subscription = {
  id: 7,
  athleteId: 42,
  offerId: 1,
  agreedPriceCents: 7000,
  periodUnit: "month",
  periodCount: 1,
  isRecurring: true,
  startedOn: "2026-09-17",
  paidThrough: "2026-11-17",
  billingDay: 17,
  endedOn: null,
  createdAt: "2026-09-17T00:00:00.000Z",
  updatedAt: "2026-09-17T00:00:00.000Z",
};

describe("draft price", () => {
  it("follows the picked offer until the coach types a price", () => {
    const withOffer = draftWithOffer(newSubscriptionDraft("2026-10-26"), "1");

    assert.equal(draftPriceText(withOffer, offers), "80");
    assert.equal(draftPriceText({ ...withOffer, priceText: "70" }, offers), "70");
  });

  it("goes back to the list price when the offer changes", () => {
    const typed = { ...draftWithOffer(newSubscriptionDraft("2026-10-26"), "1"), priceText: "70" };

    assert.equal(draftPriceText(draftWithOffer(typed, "2"), offers), "200");
  });
});

describe("offerChoices", () => {
  it("keeps active offers and the current one even if archived", () => {
    assert.deepEqual(
      offerChoices(offers, null).map((choice) => choice.id),
      [1, 2],
    );
    assert.deepEqual(
      offerChoices(offers, 3).map((choice) => choice.id),
      [1, 2, 3],
    );
  });
});

describe("validateSubscriptionDraft for a new subscription", () => {
  it("needs an offer", () => {
    const result = validateSubscriptionDraft(newSubscriptionDraft("2026-10-26"), offers, null);

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.errors.offerId, "Scegli un'offerta.");
  });

  it("defaults paid through to the start", () => {
    const result = validateSubscriptionDraft(
      draftWithOffer(newSubscriptionDraft("2026-10-26"), "1"),
      offers,
      null,
    );

    assert.deepEqual(result, {
      ok: true,
      value: { offerId: 1, agreedPriceCents: 8000, startedOn: "2026-10-26", paidThrough: "2026-10-26" },
    });
  });

  it("refuses paid through before the start", () => {
    const draft = {
      ...draftWithOffer(newSubscriptionDraft("2026-10-26"), "1"),
      paidThrough: "2026-10-25",
    };
    const result = validateSubscriptionDraft(draft, offers, null);

    assert.equal(
      result.ok ? null : result.errors.paidThrough,
      "«Pagato fino al» non può essere prima dell'inizio.",
    );
  });

  it("refuses a date outside 2000–2099", () => {
    const draft = { ...draftWithOffer(newSubscriptionDraft("1999-12-31"), "1") };
    const result = validateSubscriptionDraft(draft, offers, null);

    assert.equal(result.ok ? null : result.errors.startedOn, "Data non valida (tra il 2000 e il 2099).");
  });
});

describe("validateSubscriptionDraft at the edges", () => {
  const withOffer = (today: string) => draftWithOffer(newSubscriptionDraft(today), "1");

  it("accepts paid through equal to the start and the edges of the API range", () => {
    assert.equal(validateSubscriptionDraft(withOffer("2000-01-01"), offers, null).ok, true);
    assert.equal(
      validateSubscriptionDraft({ ...withOffer("2026-10-26"), paidThrough: "2099-12-31" }, offers, null).ok,
      true,
    );
  });

  it("refuses paid through after 2099 and an impossible start", () => {
    const lateEnd = validateSubscriptionDraft({ ...withOffer("2026-10-26"), paidThrough: "2100-01-01" }, offers, null);
    const impossibleStart = validateSubscriptionDraft(withOffer("2026-02-29"), offers, null);

    assert.equal(lateEnd.ok ? null : lateEnd.errors.paidThrough, "Data non valida (tra il 2000 e il 2099).");
    assert.equal(
      impossibleStart.ok ? null : impossibleStart.errors.startedOn,
      "Data non valida (tra il 2000 e il 2099).",
    );
  });

  it("accepts a free subscription (0 €)", () => {
    const result = validateSubscriptionDraft({ ...withOffer("2026-10-26"), priceText: "0" }, offers, null);

    assert.equal(result.ok ? result.value.agreedPriceCents : null, 0);
  });

  it("refuses a price with a thousands separator", () => {
    const result = validateSubscriptionDraft({ ...withOffer("2026-10-26"), priceText: "1.000" }, offers, null);

    assert.equal(result.ok, false);
  });

  it("sends the creation body the API expects", () => {
    const result = validateSubscriptionDraft(
      { ...withOffer("2026-09-17"), priceText: "70", paidThrough: "2026-10-17" },
      offers,
      null,
    );

    assert.deepEqual(result.ok ? subscriptionInputForCreation(result.value) : null, {
      offerId: 1,
      agreedPriceCents: 7000,
      startedOn: "2026-09-17",
      paidThrough: "2026-10-17",
    });
  });
});

describe("validateSubscriptionDraft for an edit", () => {
  it("refuses a start after the end of a closed subscription", () => {
    const closed = { ...saved, endedOn: "2026-10-01" };
    const result = validateSubscriptionDraft(
      { ...draftFromSubscription(closed), startedOn: "2026-10-02" },
      offers,
      closed,
    );

    assert.equal(result.ok ? null : result.errors.startedOn, "La chiusura non può essere prima dell'inizio.");
  });

  it("accepts a start equal to paid through", () => {
    const result = validateSubscriptionDraft(
      { ...draftFromSubscription(saved), startedOn: saved.paidThrough },
      offers,
      saved,
    );

    assert.equal(result.ok, true);
  });

  it("keeps a subscription whose offer was deleted, without sending an offer", () => {
    const withoutOffer = { ...saved, offerId: null };
    const result = validateSubscriptionDraft(
      { ...draftFromSubscription(withoutOffer), priceText: "75" },
      offers,
      withoutOffer,
    );

    assert.deepEqual(result.ok ? subscriptionChanges(withoutOffer, result.value) : null, {
      agreedPriceCents: 7500,
    });
  });
});

describe("subscriptionChanges", () => {
  const validEdit = (draftChanges: Partial<ReturnType<typeof draftFromSubscription>>) => {
    const result = validateSubscriptionDraft(
      { ...draftFromSubscription(saved), ...draftChanges },
      offers,
      saved,
    );
    assert.equal(result.ok, true);

    return result.ok ? subscriptionChanges(saved, result.value) : {};
  };

  it("sends nothing when nothing changed", () => {
    assert.deepEqual(validEdit({}), {});
  });

  it("sends only the changed price", () => {
    assert.deepEqual(validEdit({ priceText: "75" }), { agreedPriceCents: 7500 });
  });

  it("sends a new offer with its price", () => {
    assert.deepEqual(validEdit({ offerId: "2", priceText: null }), {
      offerId: 2,
      agreedPriceCents: 20000,
    });
  });

  it("never sends paid through", () => {
    const changes = validEdit({ startedOn: "2026-09-01", paidThrough: "2026-12-01" });

    assert.equal("paidThrough" in changes, false);
    assert.equal(changes.startedOn, "2026-09-01");
  });

  it("refuses a start after paid through", () => {
    const result = validateSubscriptionDraft(
      { ...draftFromSubscription(saved), startedOn: "2026-11-18" },
      offers,
      saved,
    );

    assert.equal(result.ok, false);
  });
});

describe("doesChangeAdvanceRevision", () => {
  it("is true for a new start", () => {
    assert.equal(doesChangeAdvanceRevision(saved, { startedOn: "2026-09-01" }, offers), true);
  });

  it("is true for an offer in weeks instead of months", () => {
    assert.equal(doesChangeAdvanceRevision(saved, { offerId: 2 }, offers), true);
  });

  it("is false for an offer with the same unit but another count (the API checks only the unit)", () => {
    const quarterly = { ...offer(4, 21000), periodCount: 3 };

    assert.equal(doesChangeAdvanceRevision(saved, { offerId: 4 }, [...offers, quarterly]), false);
  });

  it("is false for a closing or a resume", () => {
    assert.equal(doesChangeAdvanceRevision(saved, { endedOn: "2026-10-26" }, offers), false);
    assert.equal(doesChangeAdvanceRevision(saved, { endedOn: null }, offers), false);
  });

  it("is false for an offer with the same unit or a price change", () => {
    assert.equal(doesChangeAdvanceRevision(saved, { offerId: 3 }, offers), false);
    assert.equal(doesChangeAdvanceRevision(saved, { agreedPriceCents: 9000 }, offers), false);
  });
});

describe("hasUndoableChange", () => {
  const payment = (canUndo: boolean): Payment => ({
    id: 1,
    amountCents: 8000,
    paidOn: "2026-10-01",
    method: "cash",
    periods: 1,
    coversFrom: "2026-10-01",
    coversTo: "2026-11-01",
    note: null,
    canUndo,
    createdAt: "2026-10-01T00:00:00.000Z",
  });
  const pause = (canRemove: boolean): Pause => ({
    id: 1,
    startsOn: "2026-11-01",
    endsOn: "2026-11-30",
    canRemove,
    createdAt: "2026-10-01T00:00:00.000Z",
  });

  it("is true with a payment that can be undone or a pause that can be removed", () => {
    assert.equal(hasUndoableChange([payment(false), payment(true)], null), true);
    assert.equal(hasUndoableChange([payment(false)], pause(true)), true);
  });

  it("is false when nothing can be undone, also while the history loads", () => {
    assert.equal(hasUndoableChange([payment(false)], pause(false)), false);
    assert.equal(hasUndoableChange(undefined, null), false);
  });
});
