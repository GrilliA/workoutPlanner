import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPeriods,
  coverageForPayment,
  pauseLengthDays,
  applyPause,
  paymentPreview,
  paymentUndo,
  pauseRemoval,
  subscriptionState,
  suggestedPaymentStart,
  termsAfterOfferChange,
} from "./subscription";

const monthlyOn = (billingDay: number) =>
  ({ periodUnit: "month", periodCount: 1, billingDay }) as const;
const quarterlyOn = (billingDay: number) =>
  ({ periodUnit: "month", periodCount: 3, billingDay }) as const;
const twelveWeeks = { periodUnit: "week", periodCount: 12, billingDay: 21 } as const;

describe("addPeriods", () => {
  it("moves by whole months on the billing day", () => {
    assert.equal(addPeriods("2026-10-28", monthlyOn(28), 1), "2026-11-28");
    assert.equal(addPeriods("2026-10-28", monthlyOn(28), 3), "2027-01-28");
    assert.equal(addPeriods("2026-10-25", quarterlyOn(25), 1), "2027-01-25");
  });

  it("stops at the end of a shorter month", () => {
    assert.equal(addPeriods("2026-01-31", monthlyOn(31), 1), "2026-02-28");
    assert.equal(addPeriods("2028-01-31", monthlyOn(31), 1), "2028-02-29");
    assert.equal(addPeriods("2026-11-30", quarterlyOn(30), 1), "2027-02-28");
  });

  it("goes back to the billing day after a shorter month", () => {
    const afterFebruary = addPeriods("2026-01-31", monthlyOn(31), 1);
    const afterMarch = addPeriods(afterFebruary, monthlyOn(31), 1);
    const afterApril = addPeriods(afterMarch, monthlyOn(31), 1);

    assert.equal(afterFebruary, "2026-02-28");
    assert.equal(afterMarch, "2026-03-31");
    assert.equal(afterApril, "2026-04-30");
  });

  it("moves by weeks in days, ignoring the billing day", () => {
    assert.equal(addPeriods("2026-09-21", twelveWeeks, 1), "2026-12-14");
  });
});

describe("suggestedPaymentStart", () => {
  it("continues from the paid period when the payment is late", () => {
    assert.equal(
      suggestedPaymentStart({
        paidThrough: "2026-10-17",
        paidOn: "2026-10-22",
        period: monthlyOn(17),
      }),
      "paid_through",
    );
  });

  it("still continues when the payment comes exactly one period late", () => {
    assert.equal(
      suggestedPaymentStart({
        paidThrough: "2026-09-17",
        paidOn: "2026-10-17",
        period: monthlyOn(17),
      }),
      "paid_through",
    );
  });

  it("starts from the payment day after more than a whole period away", () => {
    assert.equal(
      suggestedPaymentStart({
        paidThrough: "2026-06-17",
        paidOn: "2026-10-22",
        period: monthlyOn(17),
      }),
      "paid_on",
    );
  });
});

describe("coverageForPayment", () => {
  it("starts from the old paid-through date and keeps the billing day", () => {
    assert.deepEqual(
      coverageForPayment({
        paidThrough: "2026-10-17",
        paidOn: "2026-10-22",
        start: "paid_through",
        period: monthlyOn(17),
        periods: 1,
      }),
      { coversFrom: "2026-10-17", coversTo: "2026-11-17", billingDay: 17 },
    );
  });

  it("covers several periods at once", () => {
    assert.deepEqual(
      coverageForPayment({
        paidThrough: "2026-10-28",
        paidOn: "2026-10-22",
        start: "paid_through",
        period: monthlyOn(28),
        periods: 2,
      }),
      { coversFrom: "2026-10-28", coversTo: "2026-12-28", billingDay: 28 },
    );
  });

  it("starts again from the payment day, which becomes the billing day", () => {
    assert.deepEqual(
      coverageForPayment({
        paidThrough: "2026-06-17",
        paidOn: "2026-10-22",
        start: "paid_on",
        period: monthlyOn(17),
        periods: 1,
      }),
      { coversFrom: "2026-10-22", coversTo: "2026-11-22", billingDay: 22 },
    );
  });
});

describe("pause", () => {
  const pause = { startsOn: "2026-10-27", endsOn: "2026-11-05" };

  it("counts both the first and the last day", () => {
    assert.equal(pauseLengthDays(pause), 10);
    assert.equal(pauseLengthDays({ startsOn: "2026-10-27", endsOn: "2026-10-27" }), 1);
  });

  it("moves paid-through forward and the billing day with it", () => {
    assert.deepEqual(applyPause({ paidThrough: "2026-10-28", billingDay: 28, pause }), {
      paidThrough: "2026-11-07",
      billingDay: 7,
    });
  });
});

describe("applyPause", () => {
  const november = { startsOn: "2026-11-01", endsOn: "2026-11-30" };

  it("moves nothing when the paid period ends before the pause", () => {
    assert.deepEqual(applyPause({ paidThrough: "2026-10-31", billingDay: 31, pause: november }), {
      paidThrough: "2026-10-31",
      billingDay: 31,
    });
  });

  it("moves by the whole pause when paid-through is its first day", () => {
    assert.deepEqual(applyPause({ paidThrough: "2026-11-01", billingDay: 1, pause: november }), {
      paidThrough: "2026-12-01",
      billingDay: 1,
    });
  });

  it("gives back the paid days inside the pause right after it", () => {
    assert.deepEqual(applyPause({ paidThrough: "2026-11-05", billingDay: 5, pause: november }), {
      paidThrough: "2026-12-05",
      billingDay: 5,
    });
  });

  it("moves by the whole pause when paid-through is after it", () => {
    assert.deepEqual(applyPause({ paidThrough: "2026-12-10", billingDay: 10, pause: november }), {
      paidThrough: "2027-01-09",
      billingDay: 9,
    });
  });
});

describe("subscriptionState", () => {
  const today = "2026-10-22";

  it("is expiring within 7 days, today included", () => {
    assert.deepEqual(
      subscriptionState({ paidThrough: "2026-10-28", endedOn: null, today, activePause: null }),
      { status: "expiring", daysLeft: 6, pausedUntil: null },
    );
    assert.equal(
      subscriptionState({ paidThrough: "2026-10-29", endedOn: null, today, activePause: null })
        .status,
      "expiring",
    );
    assert.equal(
      subscriptionState({ paidThrough: today, endedOn: null, today, activePause: null }).status,
      "expiring",
    );
  });

  it("is active after the 7-day window", () => {
    assert.deepEqual(
      subscriptionState({ paidThrough: "2026-10-30", endedOn: null, today, activePause: null }),
      { status: "active", daysLeft: 8, pausedUntil: null },
    );
  });

  it("is expired the day after paid-through", () => {
    assert.deepEqual(
      subscriptionState({ paidThrough: "2026-10-17", endedOn: null, today, activePause: null }),
      { status: "expired", daysLeft: -5, pausedUntil: null },
    );
  });

  it("is paused only while the pause is running", () => {
    const running = { startsOn: "2026-10-20", endsOn: "2026-11-03" };
    assert.deepEqual(
      subscriptionState({ paidThrough: "2026-11-18", endedOn: null, today, activePause: running }),
      { status: "paused", daysLeft: 27, pausedUntil: "2026-11-03" },
    );

    const upcoming = { startsOn: "2026-10-27", endsOn: "2026-11-05" };
    assert.equal(
      subscriptionState({ paidThrough: "2026-11-07", endedOn: null, today, activePause: upcoming })
        .status,
      "active",
    );
  });

  it("is ended from the end day on, before any other status", () => {
    const running = { startsOn: "2026-10-20", endsOn: "2026-11-03" };
    assert.deepEqual(
      subscriptionState({ paidThrough: "2026-11-18", endedOn: today, today, activePause: running }),
      { status: "ended", daysLeft: 27, pausedUntil: null },
    );
    assert.equal(
      subscriptionState({ paidThrough: "2026-10-17", endedOn: "2026-10-01", today, activePause: null })
        .status,
      "ended",
    );
  });

  it("is not ended yet when the end day is in the future", () => {
    assert.equal(
      subscriptionState({ paidThrough: "2026-10-30", endedOn: "2026-10-23", today, activePause: null })
        .status,
      "active",
    );
  });
});

describe("paymentPreview", () => {
  it("does not allow restarting from the payment day when it would shorten the paid period", () => {
    assert.deepEqual(
      paymentPreview({
        paidThrough: "2026-12-17",
        paidOn: "2026-10-22",
        period: monthlyOn(17),
        periods: 1,
      }),
      {
        suggestedStart: "paid_through",
        options: [
          { start: "paid_through", coversFrom: "2026-12-17", coversTo: "2027-01-17", isAllowed: true },
          { start: "paid_on", coversFrom: "2026-10-22", coversTo: "2026-11-22", isAllowed: false },
        ],
      },
    );
  });

  it("allows both starts after a long break and suggests the payment day", () => {
    const preview = paymentPreview({
      paidThrough: "2026-06-17",
      paidOn: "2026-10-22",
      period: monthlyOn(17),
      periods: 2,
    });

    assert.equal(preview.suggestedStart, "paid_on");
    assert.deepEqual(
      preview.options.map((option) => [option.start, option.coversTo, option.isAllowed]),
      [
        ["paid_through", "2026-08-17", true],
        ["paid_on", "2026-12-22", true],
      ],
    );
  });
});

describe("paymentUndo", () => {
  const payment = {
    id: 31,
    revision: 4,
    previousPaidThrough: "2026-10-17",
    previousBillingDay: 17,
  };
  const openSubscription = { endedOn: null, revision: 4 };
  const today = "2026-10-22";

  it("restores the values before the latest payment and steps the revision back", () => {
    assert.deepEqual(
      paymentUndo({ payment, latestPaymentId: 31, subscription: openSubscription, today }),
      { ok: true, value: { paidThrough: "2026-10-17", billingDay: 17, revision: 3 } },
    );
  });

  it("refuses on an ended subscription", () => {
    assert.deepEqual(
      paymentUndo({
        payment,
        latestPaymentId: 31,
        subscription: { endedOn: today, revision: 4 },
        today,
      }),
      { ok: false, error: "Subscription has ended" },
    );
  });

  it("refuses a payment that is not the latest", () => {
    assert.deepEqual(
      paymentUndo({ payment, latestPaymentId: 32, subscription: openSubscription, today }),
      { ok: false, error: "Only the latest payment can be undone" },
    );
  });

  it("refuses when something changed the subscription after the payment", () => {
    assert.deepEqual(
      paymentUndo({
        payment,
        latestPaymentId: 31,
        subscription: { endedOn: null, revision: 5 },
        today,
      }),
      { ok: false, error: "Only the latest change can be undone" },
    );
  });

  it("refuses a payment written before the previous values were stored", () => {
    assert.deepEqual(
      paymentUndo({
        payment: { ...payment, previousPaidThrough: null, previousBillingDay: null },
        latestPaymentId: 31,
        subscription: openSubscription,
        today,
      }),
      { ok: false, error: "Only the latest change can be undone" },
    );
  });
});

describe("pauseRemoval", () => {
  const pause = {
    startsOn: "2026-11-01",
    endsOn: "2026-11-30",
    revision: 3,
    previousPaidThrough: "2026-11-05",
    previousBillingDay: 5,
  };
  const openSubscription = { endedOn: null, revision: 3 };

  it("cancels a pause that has not started and restores the values before it", () => {
    assert.deepEqual(
      pauseRemoval({ pause, subscription: openSubscription, today: "2026-10-22" }),
      {
        ok: true,
        value: { action: "cancel", paidThrough: "2026-11-05", billingDay: 5, revision: 2 },
      },
    );
  });

  it("cancels a pause that starts today", () => {
    assert.deepEqual(
      pauseRemoval({ pause, subscription: openSubscription, today: "2026-11-01" }),
      {
        ok: true,
        value: { action: "cancel", paidThrough: "2026-11-05", billingDay: 5, revision: 2 },
      },
    );
  });

  it("ends a running pause yesterday and gives back the days not taken", () => {
    assert.deepEqual(
      pauseRemoval({ pause, subscription: openSubscription, today: "2026-11-10" }),
      {
        ok: true,
        value: {
          action: "end_yesterday",
          endsOn: "2026-11-09",
          paidThrough: "2026-11-14",
          billingDay: 14,
          revision: 4,
        },
      },
    );
  });

  it("keeps paid-through when the shorter pause still starts after it", () => {
    const afterPaidPeriod = { ...pause, previousPaidThrough: "2026-10-25", previousBillingDay: 25 };
    assert.deepEqual(
      pauseRemoval({ pause: afterPaidPeriod, subscription: openSubscription, today: "2026-11-10" }),
      {
        ok: true,
        value: {
          action: "end_yesterday",
          endsOn: "2026-11-09",
          paidThrough: "2026-10-25",
          billingDay: 25,
          revision: 4,
        },
      },
    );
  });

  it("refuses on an ended subscription, a past pause or a later change", () => {
    assert.deepEqual(
      pauseRemoval({
        pause,
        subscription: { endedOn: "2026-10-22", revision: 3 },
        today: "2026-10-22",
      }),
      { ok: false, error: "Subscription has ended" },
    );
    assert.deepEqual(
      pauseRemoval({ pause, subscription: openSubscription, today: "2026-12-01" }),
      { ok: false, error: "Pause has already ended" },
    );
    assert.deepEqual(
      pauseRemoval({ pause, subscription: { endedOn: null, revision: 4 }, today: "2026-11-10" }),
      { ok: false, error: "Only the latest change can be undone" },
    );
    assert.deepEqual(
      pauseRemoval({
        pause: { ...pause, previousPaidThrough: null },
        subscription: openSubscription,
        today: "2026-11-10",
      }),
      { ok: false, error: "Only the latest change can be undone" },
    );
  });
});

describe("termsAfterOfferChange", () => {
  const subscription = {
    paidThrough: "2026-10-28",
    periodUnit: "month",
    billingDay: 31,
    revision: 2,
  } as const;
  const offer = (periodUnit: "month" | "week") => ({
    id: 9,
    priceCents: 9000,
    periodUnit,
    periodCount: 3,
    isRecurring: false,
  });

  it("copies the offer and keeps billing day and revision for the same unit", () => {
    assert.deepEqual(
      termsAfterOfferChange({ subscription, offer: offer("month"), agreedPriceCents: undefined }),
      {
        offerId: 9,
        agreedPriceCents: 9000,
        periodUnit: "month",
        periodCount: 3,
        isRecurring: false,
        billingDay: 31,
        revision: 2,
      },
    );
  });

  it("restarts the billing day from paid-through and moves the revision for a new unit", () => {
    const terms = termsAfterOfferChange({
      subscription,
      offer: offer("week"),
      agreedPriceCents: 7000,
    });

    assert.equal(terms.agreedPriceCents, 7000);
    assert.equal(terms.billingDay, 28);
    assert.equal(terms.revision, 3);
  });
});
