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
    assert.deepEqual(formatCoachingStatus(coaching()), {
      title: "Coaching attivo",
      detail: "fino al 12 dicembre",
    });
  });

  it("elides the article before 1, 8 and 11 only", () => {
    const detailFor = (paidThrough: string) =>
      formatCoachingStatus(coaching({ paidThrough })).detail;
    assert.equal(detailFor("2026-12-01"), "fino all'1 dicembre");
    assert.equal(detailFor("2026-12-08"), "fino all'8 dicembre");
    assert.equal(detailFor("2026-12-11"), "fino all'11 dicembre");
    assert.equal(detailFor("2026-12-18"), "fino al 18 dicembre");
    assert.equal(detailFor("2026-12-21"), "fino al 21 dicembre");
    assert.equal(detailFor("2026-12-28"), "fino al 28 dicembre");
  });

  it("counts the days of an expiring coaching", () => {
    assert.deepEqual(formatCoachingStatus(coaching({ status: "expiring", daysLeft: 0 })), {
      title: "Coaching in scadenza oggi",
    });
    assert.deepEqual(formatCoachingStatus(coaching({ status: "expiring", daysLeft: 1 })), {
      title: "Coaching in scadenza domani",
    });
    assert.deepEqual(formatCoachingStatus(coaching({ status: "expiring", daysLeft: 5 })), {
      title: "Coaching in scadenza tra 5 giorni",
    });
  });

  it("uses the design copy for an expired coaching, on two lines", () => {
    assert.deepEqual(formatCoachingStatus(coaching({ status: "expired", daysLeft: -3 })), {
      title: "Coaching da rinnovare",
      detail: "La scheda resta attiva",
    });
  });

  it("says until when the coaching is paused, with the same elision", () => {
    assert.deepEqual(
      formatCoachingStatus(coaching({ status: "paused", pausedUntil: "2026-11-24" })),
      { title: "Coaching in pausa", detail: "fino al 24 novembre" },
    );
    assert.equal(
      formatCoachingStatus(coaching({ status: "paused", pausedUntil: "2026-12-11" })).detail,
      "fino all'11 dicembre",
    );
    assert.equal(
      formatCoachingStatus(coaching({ status: "paused", pausedUntil: "2026-12-08" })).detail,
      "fino all'8 dicembre",
    );
    assert.deepEqual(formatCoachingStatus(coaching({ status: "paused" })), {
      title: "Coaching in pausa",
      detail: undefined,
    });
  });

  it("says Coaching concluso for an ended coaching", () => {
    assert.deepEqual(formatCoachingStatus(coaching({ status: "ended" })), {
      title: "Coaching concluso",
    });
  });

  it("never mentions a price or a payment", () => {
    const statuses = ["active", "expiring", "expired", "paused", "ended"] as const;
    statuses.forEach((status) => {
      const { title, detail } = formatCoachingStatus(coaching({ status, pausedUntil: "2026-11-24" }));
      assert.doesNotMatch(`${title} ${detail ?? ""}`, PRICE_OR_PAYMENT);
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
