import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDuration,
  formatEveryPeriod,
  formatRenewalKind,
  formatRenewalSchedule,
} from "./billingPeriod.ts";

describe("formatDuration", () => {
  it("uses singular and plural for months and weeks", () => {
    assert.equal(formatDuration({ periodUnit: "month", periodCount: 1 }), "1 mese");
    assert.equal(formatDuration({ periodUnit: "month", periodCount: 3 }), "3 mesi");
    assert.equal(formatDuration({ periodUnit: "week", periodCount: 1 }), "1 settimana");
    assert.equal(formatDuration({ periodUnit: "week", periodCount: 12 }), "12 settimane");
  });
});

describe("formatEveryPeriod", () => {
  it("drops the count of a single period", () => {
    assert.equal(formatEveryPeriod({ periodUnit: "month", periodCount: 1 }), "ogni mese");
    assert.equal(formatEveryPeriod({ periodUnit: "week", periodCount: 1 }), "ogni settimana");
  });

  it("keeps the count otherwise", () => {
    assert.equal(formatEveryPeriod({ periodUnit: "month", periodCount: 3 }), "ogni 3 mesi");
    assert.equal(formatEveryPeriod({ periodUnit: "week", periodCount: 12 }), "ogni 12 settimane");
  });
});

describe("formatRenewalKind", () => {
  it("names recurring and one-off offers", () => {
    assert.equal(formatRenewalKind(true), "Ricorrente");
    assert.equal(formatRenewalKind(false), "Una tantum");
  });
});

describe("formatRenewalSchedule", () => {
  it("says how often a recurring subscription renews", () => {
    assert.equal(
      formatRenewalSchedule({ periodUnit: "month", periodCount: 1, isRecurring: true }),
      "Ogni mese",
    );
    assert.equal(
      formatRenewalSchedule({ periodUnit: "month", periodCount: 3, isRecurring: true }),
      "Ogni 3 mesi",
    );
  });

  it("says one-off for a subscription that does not renew", () => {
    assert.equal(
      formatRenewalSchedule({ periodUnit: "week", periodCount: 12, isRecurring: false }),
      "Una tantum",
    );
  });
});
