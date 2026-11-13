import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCoachBusiness,
  businessMonths,
  collectedByMonth,
  expectedNext30DaysCents,
  lostByMonth,
  monthlyAmountCents,
  monthlyRecurring,
  parseBusinessRange,
  renewalDatesBetween,
  renewalsLast90Days,
  type BusinessPayment,
  type BusinessSubscription,
} from "./coachBusiness";

const today = "2026-11-13";

// Expected values are written by hand, not with the code under test.

/** Monthly, recurring, paid until 6 December: counts everywhere. */
const monthly: BusinessSubscription = {
  id: 1,
  agreedPriceCents: 8000,
  periodUnit: "month",
  periodCount: 1,
  billingDay: 6,
  isRecurring: true,
  startedOn: "2026-01-06",
  paidThrough: "2026-12-06",
  endedOn: null,
  runningPause: null,
};

const payment = (overrides: Partial<BusinessPayment>): BusinessPayment => ({
  subscriptionId: monthly.id,
  amountCents: 8000,
  paidOn: "2026-10-06",
  coversFrom: "2026-10-06",
  previousPaidThrough: "2026-10-06",
  ...overrides,
});

describe("parseBusinessRange", () => {
  it("absent is 6m, 6m and 12m pass, anything else is null", () => {
    assert.equal(parseBusinessRange(undefined), "6m");
    assert.equal(parseBusinessRange("6m"), "6m");
    assert.equal(parseBusinessRange("12m"), "12m");
    assert.equal(parseBusinessRange("3m"), null);
    assert.equal(parseBusinessRange(""), null);
    assert.equal(parseBusinessRange(["6m", "12m"]), null);
  });
});

describe("businessMonths", () => {
  it("6m is the current month and the 5 before it, oldest first", () => {
    assert.deepEqual(businessMonths(today, "6m"), [
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
  });

  it("12m crosses the year and ends with the current month", () => {
    const months = businessMonths("2026-03-31", "12m");
    assert.equal(months.length, 12);
    assert.equal(months[0], "2025-04");
    assert.equal(months[9], "2026-01");
    assert.equal(months[11], "2026-03");
  });
});

describe("monthlyAmountCents", () => {
  it("monthly: the price; quarterly: the price / 3", () => {
    assert.equal(monthlyAmountCents({ agreedPriceCents: 8000, periodUnit: "month", periodCount: 1 }), 8000);
    assert.equal(monthlyAmountCents({ agreedPriceCents: 21000, periodUnit: "month", periodCount: 3 }), 7000);
  });

  it("12 weeks: price × 52 / 12 / 12, rounded to the nearest cent", () => {
    // 30000 × 52 / 12 / 12 = 10833.33…
    assert.equal(monthlyAmountCents({ agreedPriceCents: 30000, periodUnit: "week", periodCount: 12 }), 10833);
  });

  it("half a cent rounds up", () => {
    // 1001 / 2 = 500.5; 3 × 52 / 12 / 1 = 13
    assert.equal(monthlyAmountCents({ agreedPriceCents: 1001, periodUnit: "month", periodCount: 2 }), 501);
    assert.equal(monthlyAmountCents({ agreedPriceCents: 3, periodUnit: "week", periodCount: 1 }), 13);
  });
});

describe("monthlyRecurring", () => {
  it("sums the rounded monthly amounts of running recurring subscriptions; an expired one counts", () => {
    const twelveWeeks = { ...monthly, id: 2, agreedPriceCents: 30000, periodUnit: "week" as const, periodCount: 12 };
    const expired = { ...monthly, id: 3, paidThrough: "2026-11-01" };
    assert.deepEqual(monthlyRecurring([monthly, twelveWeeks, expired], today), {
      cents: 8000 + 10833 + 8000,
      clientCount: 3,
    });
  });

  it("a running pause, an ended or a non-recurring subscription does not count", () => {
    const paused = { ...monthly, id: 2, runningPause: { startsOn: "2026-11-10", endsOn: "2026-11-20" } };
    const ended = { ...monthly, id: 3, endedOn: "2026-11-13" };
    const package_ = { ...monthly, id: 4, isRecurring: false };
    assert.deepEqual(monthlyRecurring([paused, ended, package_], today), { cents: 0, clientCount: 0 });
  });

  it("a future end date or a pause that has not started still counts", () => {
    const endsLater = { ...monthly, id: 2, endedOn: "2026-12-31" };
    const pauseLater = { ...monthly, id: 3, runningPause: { startsOn: "2026-11-20", endsOn: "2026-11-30" } };
    assert.deepEqual(monthlyRecurring([endsLater, pauseLater], today), { cents: 16000, clientCount: 2 });
  });

  it("after an offer change the current terms count, the payments keep their amounts", () => {
    // Was 80 € a month, now 70 € every 4 weeks: 7000 × 52 / 12 / 4 = 7583.33…
    const changed = { ...monthly, agreedPriceCents: 7000, periodUnit: "week" as const, periodCount: 4 };
    const oldPayment = payment({ paidOn: "2026-10-06", amountCents: 8000 });
    const business = buildCoachBusiness({ range: "6m", today, subscriptions: [changed], payments: [oldPayment] });
    assert.equal(business.monthlyRecurringCents, 7583);
    assert.deepEqual(business.collectedByMonth.find((entry) => entry.month === "2026-10"), {
      month: "2026-10",
      amountCents: 8000,
    });
  });
});

describe("renewalDatesBetween", () => {
  it("a weekly subscription renews every week inside the window", () => {
    const weekly = { ...monthly, periodUnit: "week" as const, paidThrough: "2026-11-15" };
    assert.deepEqual(renewalDatesBetween(weekly, today, "2026-12-12"), [
      "2026-11-15",
      "2026-11-22",
      "2026-11-29",
      "2026-12-06",
    ]);
  });

  it("a monthly one keeps its billing day; dates from the end date on are dropped", () => {
    const endOfMonth = { ...monthly, billingDay: 31, paidThrough: "2026-11-30" };
    assert.deepEqual(renewalDatesBetween(endOfMonth, "2026-11-01", "2027-02-28"), [
      "2026-11-30",
      "2026-12-31",
      "2027-01-31",
      "2027-02-28",
    ]);
    const endsInJanuary = { ...endOfMonth, endedOn: "2027-01-31" };
    assert.deepEqual(renewalDatesBetween(endsInJanuary, "2026-11-01", "2027-02-28"), [
      "2026-11-30",
      "2026-12-31",
    ]);
  });
});

describe("expectedNext30DaysCents", () => {
  it("counts each renewal from today to today + 29", () => {
    const dueToday = { ...monthly, id: 1, paidThrough: today, billingDay: 13 };
    const dueOnLastDay = { ...monthly, id: 2, paidThrough: "2026-12-12", billingDay: 12 };
    // Billing day 6 with paidThrough on the 13th: the first renewal is still the 13th.
    const dueTooLate = { ...monthly, id: 3, paidThrough: "2026-12-13" };
    const weekly = { ...monthly, id: 4, agreedPriceCents: 2000, periodUnit: "week" as const, paidThrough: "2026-11-15" };
    // weekly: 15/11, 22/11, 29/11, 06/12 → 4 × 2000
    assert.equal(expectedNext30DaysCents([dueToday, dueOnLastDay, dueTooLate, weekly], today), 8000 + 8000 + 8000);
  });

  it("expired, paused, ended and non-recurring subscriptions are not expected", () => {
    const expired = { ...monthly, id: 1, paidThrough: "2026-11-12" };
    const paused = {
      ...monthly,
      id: 2,
      paidThrough: "2026-11-25",
      runningPause: { startsOn: "2026-11-10", endsOn: "2026-11-20" },
    };
    const ended = { ...monthly, id: 3, paidThrough: "2026-11-20", endedOn: "2026-11-01" };
    const package_ = { ...monthly, id: 4, paidThrough: "2026-11-20", isRecurring: false };
    assert.equal(expectedNext30DaysCents([expired, paused, ended, package_], today), 0);
  });
});

describe("collectedByMonth", () => {
  it("one entry per month, zero for a month without payments, current month included", () => {
    const months = businessMonths(today, "6m");
    const payments = [
      payment({ paidOn: "2026-05-31", amountCents: 999 }),
      payment({ paidOn: "2026-07-01", amountCents: 8000 }),
      payment({ paidOn: "2026-07-31", amountCents: 2500 }),
      payment({ paidOn: "2026-11-13", amountCents: 4000 }),
    ];
    assert.deepEqual(collectedByMonth(payments, months), [
      { month: "2026-06", amountCents: 0 },
      { month: "2026-07", amountCents: 10500 },
      { month: "2026-08", amountCents: 0 },
      { month: "2026-09", amountCents: 0 },
      { month: "2026-10", amountCents: 0 },
      { month: "2026-11", amountCents: 4000 },
    ]);
  });
});

describe("lostByMonth", () => {
  it("counts ended subscriptions by the month of endedOn; a future end is not lost yet", () => {
    const months = businessMonths(today, "6m");
    const subscriptions = [
      { ...monthly, id: 1, endedOn: "2026-10-02" },
      { ...monthly, id: 2, endedOn: "2026-10-30", isRecurring: false },
      { ...monthly, id: 3, endedOn: today },
      { ...monthly, id: 4, endedOn: "2026-11-20" },
      { ...monthly, id: 5, endedOn: "2026-05-31" },
      { ...monthly, id: 6 },
    ];
    assert.deepEqual(lostByMonth(subscriptions, months, today), [
      { month: "2026-06", count: 0 },
      { month: "2026-07", count: 0 },
      { month: "2026-08", count: 0 },
      { month: "2026-09", count: 0 },
      { month: "2026-10", count: 2 },
      { month: "2026-11", count: 1 },
    ]);
  });
});

describe("renewalsLast90Days", () => {
  // The window is 2026-08-16 … 2026-11-13.
  it("a renewal payment starting in the window is renewed; the first payment is not a renewal", () => {
    const payments = [
      payment({ coversFrom: "2026-08-16", previousPaidThrough: "2026-08-16" }),
      payment({ coversFrom: today, previousPaidThrough: today }),
      payment({ coversFrom: "2026-08-15", previousPaidThrough: "2026-08-15" }),
      payment({ coversFrom: "2026-11-14", previousPaidThrough: "2026-11-14" }),
      // First payment: nothing was paid before it.
      payment({ coversFrom: "2026-09-01", previousPaidThrough: "2026-01-06" }),
    ];
    assert.deepEqual(renewalsLast90Days([monthly], payments, today), { due: 2, renewed: 2 });
  });

  it("a client back after a long break (paid_on start) is renewed; rows before 0015 use coversFrom", () => {
    const backAfterBreak = payment({ coversFrom: "2026-10-20", previousPaidThrough: "2026-08-01" });
    const oldRow = payment({ coversFrom: "2026-09-06", previousPaidThrough: null });
    const oldFirstRow = payment({ coversFrom: monthly.startedOn, previousPaidThrough: null, paidOn: "2026-09-01" });
    assert.deepEqual(renewalsLast90Days([monthly], [backAfterBreak, oldRow, oldFirstRow], today), {
      due: 2,
      renewed: 2,
    });
  });

  it("an unpaid due date in the window before today is missed, an ended client too; today is not late", () => {
    const missed = { ...monthly, id: 1, paidThrough: "2026-11-12" };
    const leftWithoutPaying = { ...monthly, id: 2, paidThrough: "2026-09-06", endedOn: "2026-10-01" };
    const dueToday = { ...monthly, id: 3, paidThrough: today };
    const missedLongAgo = { ...monthly, id: 4, paidThrough: "2026-08-15" };
    const package_ = { ...monthly, id: 5, paidThrough: "2026-10-01", isRecurring: false };
    assert.deepEqual(
      renewalsLast90Days([missed, leftWithoutPaying, dueToday, missedLongAgo, package_], [], today),
      { due: 2, renewed: 0 },
    );
  });

  it("a paused subscription is never missed: the pause moved paidThrough past its end", () => {
    const paused = {
      ...monthly,
      paidThrough: "2026-11-25",
      runningPause: { startsOn: "2026-11-01", endsOn: "2026-11-20" },
    };
    // Dirty data: a running pause with paidThrough still in the past is still not missed.
    const pausedUnpaid = { ...paused, id: 2, paidThrough: "2026-10-30" };
    assert.deepEqual(renewalsLast90Days([paused, pausedUnpaid], [], today), { due: 0, renewed: 0 });
  });

  it("payments of non-recurring subscriptions are not renewals", () => {
    const package_ = { ...monthly, isRecurring: false };
    const renewal = payment({ coversFrom: "2026-10-06", previousPaidThrough: "2026-10-06" });
    assert.deepEqual(renewalsLast90Days([package_], [renewal], today), { due: 0, renewed: 0 });
  });
});

describe("buildCoachBusiness", () => {
  it("a coach without subscriptions gets zeros and every month of the range", () => {
    const business = buildCoachBusiness({ range: "12m", today, subscriptions: [], payments: [] });
    assert.equal(business.subscriptionCount, 0);
    assert.equal(business.monthlyRecurringCents, 0);
    assert.equal(business.recurringClientCount, 0);
    assert.equal(business.expectedNext30DaysCents, 0);
    assert.deepEqual(business.renewals90Days, { due: 0, renewed: 0 });
    assert.equal(business.collectedByMonth.length, 12);
    assert.ok(business.collectedByMonth.every((entry) => entry.amountCents === 0));
    assert.equal(business.lostByMonth.length, 12);
    assert.equal(business.lostByMonth[11]?.month, "2026-11");
  });
});
