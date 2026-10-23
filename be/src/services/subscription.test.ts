import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPeriods,
  coverageForPayment,
  pauseLengthDays,
  applyPause,
  subscriptionState,
  suggestedPaymentStart,
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
    assert.deepEqual(applyPause("2026-10-28", pause), {
      paidThrough: "2026-11-07",
      billingDay: 7,
    });
  });
});

describe("subscriptionState", () => {
  const today = "2026-10-22";

  it("is expiring within 7 days, today included", () => {
    assert.deepEqual(
      subscriptionState({ paidThrough: "2026-10-28", today, activePause: null }),
      { status: "expiring", daysLeft: 6, pausedUntil: null },
    );
    assert.equal(
      subscriptionState({ paidThrough: "2026-10-29", today, activePause: null }).status,
      "expiring",
    );
    assert.equal(
      subscriptionState({ paidThrough: today, today, activePause: null }).status,
      "expiring",
    );
  });

  it("is active after the 7-day window", () => {
    assert.deepEqual(
      subscriptionState({ paidThrough: "2026-10-30", today, activePause: null }),
      { status: "active", daysLeft: 8, pausedUntil: null },
    );
  });

  it("is expired the day after paid-through", () => {
    assert.deepEqual(
      subscriptionState({ paidThrough: "2026-10-17", today, activePause: null }),
      { status: "expired", daysLeft: -5, pausedUntil: null },
    );
  });

  it("is paused only while the pause is running", () => {
    const running = { startsOn: "2026-10-20", endsOn: "2026-11-03" };
    assert.deepEqual(
      subscriptionState({ paidThrough: "2026-11-18", today, activePause: running }),
      { status: "paused", daysLeft: 27, pausedUntil: "2026-11-03" },
    );

    const upcoming = { startsOn: "2026-10-27", endsOn: "2026-11-05" };
    assert.equal(
      subscriptionState({ paidThrough: "2026-11-07", today, activePause: upcoming }).status,
      "active",
    );
  });
});
