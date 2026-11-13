import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AthleteCoaching } from "../../../api/schemas";
import { coachingStatusTone, formatCoachingStatus } from "./coachingLabels";

const coaching = (overrides: Partial<AthleteCoaching> = {}): AthleteCoaching => ({
  coachName: "Luca Rossi",
  status: "active",
  paidThrough: "2026-12-12",
  daysLeft: 29,
  pausedUntil: null,
  ...overrides,
});

const PRICE_OR_PAYMENT = /€|\d+,\d{2}|prezzo|paga|pagamento/i;

describe("formatCoachingStatus", () => {
  it("says until when an active coaching is paid", () => {
    assert.equal(formatCoachingStatus(coaching()), "Coaching attivo · fino al 12 dicembre");
  });

  it("counts the days of an expiring coaching", () => {
    assert.equal(
      formatCoachingStatus(coaching({ status: "expiring", daysLeft: 0 })),
      "Coaching in scadenza oggi",
    );
    assert.equal(
      formatCoachingStatus(coaching({ status: "expiring", daysLeft: 1 })),
      "Coaching in scadenza domani",
    );
    assert.equal(
      formatCoachingStatus(coaching({ status: "expiring", daysLeft: 5 })),
      "Coaching in scadenza tra 5 giorni",
    );
  });

  it("uses the design copy for an expired coaching", () => {
    assert.equal(
      formatCoachingStatus(coaching({ status: "expired", daysLeft: -3 })),
      "Coaching da rinnovare · La scheda resta attiva",
    );
  });

  it("says until when the coaching is paused", () => {
    assert.equal(
      formatCoachingStatus(coaching({ status: "paused", pausedUntil: "2026-11-24" })),
      "Coaching in pausa · fino al 24 novembre",
    );
    assert.equal(formatCoachingStatus(coaching({ status: "paused" })), "Coaching in pausa");
  });

  it("says Coaching concluso for an ended coaching", () => {
    assert.equal(formatCoachingStatus(coaching({ status: "ended" })), "Coaching concluso");
  });

  it("never mentions a price or a payment", () => {
    const statuses = ["active", "expiring", "expired", "paused", "ended"] as const;
    statuses.forEach((status) => {
      const label = formatCoachingStatus(coaching({ status, pausedUntil: "2026-11-24" }));
      assert.doesNotMatch(label, PRICE_OR_PAYMENT);
    });
  });
});

describe("coachingStatusTone", () => {
  it("is calm when active, a warning to renew, neutral for pause and end", () => {
    assert.equal(coachingStatusTone("active"), "data");
    assert.equal(coachingStatusTone("expiring"), "warning");
    assert.equal(coachingStatusTone("expired"), "warning");
    assert.equal(coachingStatusTone("paused"), "neutral");
    assert.equal(coachingStatusTone("ended"), "neutral");
  });
});
