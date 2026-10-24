import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDatabaseId,
  validateNewSubscription,
  validateOfferInput,
  validateOfferPatch,
  validatePauseInput,
  validatePaymentInput,
  validatePaymentPreviewQuery,
  validateSubscriptionInput,
  validateSubscriptionUpdate,
} from "./subscriptionValidation";

const today = "2026-10-22";
const invalid = (error: string) => ({ ok: false, error });

describe("request body", () => {
  it("must be a JSON object", () => {
    const notObjects = [undefined, null, [], 5, "text", true];

    for (const body of notObjects) {
      assert.deepEqual(validateOfferInput(body), invalid("Invalid request body"));
      assert.deepEqual(validateOfferPatch(body), invalid("Invalid request body"));
      assert.deepEqual(validateSubscriptionInput(body), invalid("Invalid request body"));
      assert.deepEqual(validatePaymentInput(body, today), invalid("Invalid request body"));
      assert.deepEqual(validatePauseInput(body, today), invalid("Invalid request body"));
    }
  });
});

describe("isDatabaseId", () => {
  it("accepts positive integers that fit a Postgres integer", () => {
    assert.equal(isDatabaseId(1), true);
    assert.equal(isDatabaseId(2_147_483_647), true);
    assert.equal(isDatabaseId(2_147_483_648), false);
    assert.equal(isDatabaseId(0), false);
    assert.equal(isDatabaseId(1.5), false);
    assert.equal(isDatabaseId(Number.NaN), false);
    assert.equal(isDatabaseId("3"), false);
  });
});

describe("validateOfferInput", () => {
  const offer = { name: "  Coaching mensile ", priceCents: 8000, periodUnit: "month", periodCount: 1 };

  it("trims the name, defaults to recurring and ignores unknown fields", () => {
    assert.deepEqual(validateOfferInput({ ...offer, color: "red" }), {
      ok: true,
      value: {
        name: "Coaching mensile",
        priceCents: 8000,
        periodUnit: "month",
        periodCount: 1,
        isRecurring: true,
      },
    });
  });

  it("rejects each field out of its rule", () => {
    assert.deepEqual(validateOfferInput({ ...offer, name: "   " }), invalid("name is required"));
    assert.deepEqual(
      validateOfferInput({ ...offer, name: "x".repeat(101) }),
      invalid("name must be at most 100 characters"),
    );
    assert.deepEqual(
      validateOfferInput({ ...offer, priceCents: 1_000_001 }),
      invalid("priceCents must be an integer between 0 and 1000000"),
    );
    assert.deepEqual(
      validateOfferInput({ ...offer, priceCents: "8000" }),
      invalid("priceCents must be an integer between 0 and 1000000"),
    );
    assert.deepEqual(
      validateOfferInput({ ...offer, periodUnit: "year" }),
      invalid("periodUnit must be month or week"),
    );
    assert.deepEqual(
      validateOfferInput({ ...offer, periodCount: 53 }),
      invalid("periodCount must be an integer between 1 and 52"),
    );
    assert.deepEqual(
      validateOfferInput({ ...offer, isRecurring: null }),
      invalid("isRecurring must be a boolean"),
    );
  });
});

describe("validateOfferPatch", () => {
  it("keeps only the fields sent", () => {
    assert.deepEqual(validateOfferPatch({ archived: true }), {
      ok: true,
      value: {
        name: undefined,
        priceCents: undefined,
        periodUnit: undefined,
        periodCount: undefined,
        isRecurring: undefined,
        archived: true,
      },
    });
  });

  it("needs at least one known field", () => {
    assert.deepEqual(validateOfferPatch({ color: "red" }), invalid("At least one field is required"));
  });

  it("rejects a non-boolean archived", () => {
    assert.deepEqual(validateOfferPatch({ archived: "yes" }), invalid("archived must be a boolean"));
  });
});

describe("validateSubscriptionInput", () => {
  it("checks shape and ranges", () => {
    assert.deepEqual(validateSubscriptionInput({ offerId: 0 }), invalid("Invalid offer id"));
    assert.deepEqual(
      validateSubscriptionInput({ agreedPriceCents: -1 }),
      invalid("agreedPriceCents must be an integer between 0 and 1000000"),
    );
    assert.deepEqual(
      validateSubscriptionInput({ startedOn: "2026-02-30" }),
      invalid("startedOn must be YYYY-MM-DD"),
    );
    assert.deepEqual(
      validateSubscriptionInput({ paidThrough: "2100-01-01" }),
      invalid("paidThrough must be YYYY-MM-DD"),
    );
    assert.deepEqual(
      validateSubscriptionInput({ endedOn: "1999-12-31" }),
      invalid("endedOn must be YYYY-MM-DD or null"),
    );
  });

  it("keeps endedOn null apart from an absent endedOn", () => {
    const absentFields = {
      offerId: undefined,
      agreedPriceCents: undefined,
      startedOn: undefined,
      paidThrough: undefined,
    };

    assert.deepEqual(validateSubscriptionInput({ endedOn: null }), {
      ok: true,
      value: { ...absentFields, endedOn: null },
    });
    assert.deepEqual(validateSubscriptionInput({}), {
      ok: true,
      value: { ...absentFields, endedOn: undefined },
    });
  });
});

describe("validateNewSubscription", () => {
  it("requires offerId and startedOn", () => {
    assert.deepEqual(validateNewSubscription({}), invalid("offerId is required"));
    assert.deepEqual(validateNewSubscription({ offerId: 3 }), invalid("startedOn must be YYYY-MM-DD"));
  });

  it("starts paid through the start day and open", () => {
    assert.deepEqual(validateNewSubscription({ offerId: 3, startedOn: "2026-09-17" }), {
      ok: true,
      value: {
        offerId: 3,
        agreedPriceCents: undefined,
        startedOn: "2026-09-17",
        paidThrough: "2026-09-17",
        endedOn: null,
      },
    });
  });

  it("rejects dates before the start", () => {
    assert.deepEqual(
      validateNewSubscription({ offerId: 3, startedOn: "2026-09-17", paidThrough: "2026-09-16" }),
      invalid("paidThrough must be on or after startedOn"),
    );
    assert.deepEqual(
      validateNewSubscription({ offerId: 3, startedOn: "2026-09-17", endedOn: "2026-09-16" }),
      invalid("endedOn must be on or after startedOn"),
    );
  });
});

describe("validateSubscriptionUpdate", () => {
  const saved = { startedOn: "2026-09-17", paidThrough: "2026-10-17", endedOn: "2026-10-20" };

  it("needs at least one known field", () => {
    assert.deepEqual(validateSubscriptionUpdate({}, saved), invalid("At least one field is required"));
  });

  it("accepts paidThrough only when it is the saved value", () => {
    assert.deepEqual(
      validateSubscriptionUpdate({ paidThrough: "2026-11-17" }, saved),
      invalid("paidThrough cannot be changed after creation"),
    );
    assert.equal(validateSubscriptionUpdate({ paidThrough: "2026-10-17" }, saved).ok, true);
  });

  it("checks the dates with the body over the saved values", () => {
    assert.deepEqual(
      validateSubscriptionUpdate({ startedOn: "2026-10-18" }, saved),
      invalid("paidThrough must be on or after startedOn"),
    );
    assert.deepEqual(
      validateSubscriptionUpdate({ endedOn: "2026-09-01" }, saved),
      invalid("endedOn must be on or after startedOn"),
    );
  });

  it("reopens with endedOn null and keeps it when absent", () => {
    assert.deepEqual(validateSubscriptionUpdate({ endedOn: null }, saved), {
      ok: true,
      value: { startedOn: "2026-09-17", endedOn: null },
    });
    assert.deepEqual(validateSubscriptionUpdate({ agreedPriceCents: 7000 }, saved), {
      ok: true,
      value: { startedOn: "2026-09-17", endedOn: "2026-10-20" },
    });
  });
});

describe("validatePaymentInput", () => {
  const payment = { amountCents: 8000, paidOn: today, method: "satispay" };

  it("defaults periods to 1, start to the suggestion and an empty note to null", () => {
    assert.deepEqual(validatePaymentInput({ ...payment, note: "   " }, today), {
      ok: true,
      value: {
        amountCents: 8000,
        paidOn: today,
        method: "satispay",
        periods: 1,
        start: undefined,
        note: null,
      },
    });
  });

  it("rejects each field out of its rule", () => {
    assert.deepEqual(
      validatePaymentInput({ ...payment, amountCents: 1.5 }, today),
      invalid("amountCents must be an integer between 0 and 1000000"),
    );
    assert.deepEqual(
      validatePaymentInput({ ...payment, paidOn: "22/10/2026" }, today),
      invalid("paidOn must be YYYY-MM-DD"),
    );
    assert.deepEqual(
      validatePaymentInput({ ...payment, paidOn: "2026-10-23" }, today),
      invalid("paidOn must not be in the future"),
    );
    assert.deepEqual(
      validatePaymentInput({ ...payment, method: "card" }, today),
      invalid("method must be one of cash, bank_transfer, satispay, paypal, other"),
    );
    assert.deepEqual(
      validatePaymentInput({ ...payment, periods: 13 }, today),
      invalid("periods must be an integer between 1 and 12"),
    );
    assert.deepEqual(
      validatePaymentInput({ ...payment, start: "today" }, today),
      invalid("start must be paid_through or paid_on"),
    );
    assert.deepEqual(
      validatePaymentInput({ ...payment, note: 5 }, today),
      invalid("note must be a string or null"),
    );
    assert.deepEqual(
      validatePaymentInput({ ...payment, note: "x".repeat(501) }, today),
      invalid("note must be at most 500 characters"),
    );
  });
});

describe("validatePaymentPreviewQuery", () => {
  it("defaults periods to 1", () => {
    assert.deepEqual(validatePaymentPreviewQuery({ paidOn: today }, today), {
      ok: true,
      value: { paidOn: today, periods: 1 },
    });
  });

  it("reads periods from digits only", () => {
    assert.deepEqual(validatePaymentPreviewQuery({ paidOn: today, periods: "3" }, today), {
      ok: true,
      value: { paidOn: today, periods: 3 },
    });

    const notDigits = ["1.5", "1e1", " 2", "", "0", "13", ["1", "2"]];

    for (const periods of notDigits) {
      assert.deepEqual(
        validatePaymentPreviewQuery({ paidOn: today, periods }, today),
        invalid("periods must be an integer between 1 and 12"),
      );
    }
  });

  it("requires a paidOn that is not in the future", () => {
    assert.deepEqual(validatePaymentPreviewQuery({}, today), invalid("paidOn must be YYYY-MM-DD"));
    assert.deepEqual(
      validatePaymentPreviewQuery({ paidOn: "2026-10-23" }, today),
      invalid("paidOn must not be in the future"),
    );
  });
});

describe("validatePauseInput", () => {
  it("accepts a pause recorded up to 31 days late", () => {
    assert.deepEqual(validatePauseInput({ startsOn: "2026-09-21", endsOn: "2026-09-30" }, today), {
      ok: true,
      value: { startsOn: "2026-09-21", endsOn: "2026-09-30" },
    });
  });

  it("rejects dates out of rule", () => {
    assert.deepEqual(
      validatePauseInput({ startsOn: "2026-11-1", endsOn: "2026-11-30" }, today),
      invalid("startsOn must be YYYY-MM-DD"),
    );
    assert.deepEqual(
      validatePauseInput({ startsOn: "2026-11-01" }, today),
      invalid("endsOn must be YYYY-MM-DD"),
    );
    assert.deepEqual(
      validatePauseInput({ startsOn: "2026-11-30", endsOn: "2026-11-01" }, today),
      invalid("endsOn must be on or after startsOn"),
    );
    assert.deepEqual(
      validatePauseInput({ startsOn: "2026-09-20", endsOn: "2026-09-30" }, today),
      invalid("startsOn must be at most 31 days ago"),
    );
  });

  it("allows at most 180 days, both ends included", () => {
    assert.equal(validatePauseInput({ startsOn: "2026-11-01", endsOn: "2027-04-29" }, today).ok, true);
    assert.deepEqual(
      validatePauseInput({ startsOn: "2026-11-01", endsOn: "2027-04-30" }, today),
      invalid("Pause must be at most 180 days"),
    );
  });
});
