import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Offer } from "../../../../../../api/schemas/subscription.ts";
import {
  formatDaysLeft,
  formatMonthCount,
  formatOfferName,
  formatSubscriptionStatus,
  monthsSince,
  offerLabel,
  totalPaidCents,
} from "./subscriptionSummary.ts";

const offer = (id: number, name: string, archivedAt: string | null = null): Offer => ({
  id,
  name,
  priceCents: 8000,
  periodUnit: "month",
  periodCount: 1,
  isRecurring: true,
  archivedAt,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("formatDaysLeft", () => {
  it("counts the days ahead", () => {
    assert.equal(formatDaysLeft(6), "tra 6 giorni");
    assert.equal(formatDaysLeft(1), "domani");
    assert.equal(formatDaysLeft(0), "scade oggi");
    assert.equal(formatDaysLeft(2), "tra 2 giorni");
  });

  it("counts the days since it expired", () => {
    assert.equal(formatDaysLeft(-1), "scaduto da 1 giorno");
    assert.equal(formatDaysLeft(-3), "scaduto da 3 giorni");
  });
});

describe("formatSubscriptionStatus", () => {
  it("names every status", () => {
    const state = (status: "active" | "expiring" | "expired" | "ended") => ({
      status,
      daysLeft: 0,
      pausedUntil: null,
    });

    assert.equal(formatSubscriptionStatus(state("active")), "In regola");
    assert.equal(formatSubscriptionStatus(state("expiring")), "In scadenza");
    assert.equal(formatSubscriptionStatus(state("expired")), "Scaduto");
    assert.equal(formatSubscriptionStatus(state("ended")), "Chiuso");
  });

  it("says until when a paused subscription is paused", () => {
    assert.equal(
      formatSubscriptionStatus({ status: "paused", daysLeft: 20, pausedUntil: "2026-11-30" }),
      "In pausa fino al 30 novembre 2026",
    );
  });

  it("keeps a paused badge even without the end date", () => {
    assert.equal(formatSubscriptionStatus({ status: "paused", daysLeft: 20, pausedUntil: null }), "In pausa");
  });

  it("names the status the API computed, without recomputing it from daysLeft", () => {
    assert.equal(formatSubscriptionStatus({ status: "expired", daysLeft: -2, pausedUntil: null }), "Scaduto");
  });
});

describe("formatOfferName", () => {
  const offers = [offer(1, "Coaching mensile"), offer(2, "Trimestrale", "2026-10-01T00:00:00.000Z")];

  it("finds the offer by id and marks an archived one", () => {
    assert.equal(formatOfferName(1, offers), "Coaching mensile");
    assert.equal(formatOfferName(2, offers), "Trimestrale (archiviata)");
  });

  it("says when the offer no longer exists", () => {
    assert.equal(formatOfferName(null, offers), "Offerta non più disponibile");
    assert.equal(formatOfferName(9, offers), "Offerta non più disponibile");
  });

  it("shows a dash when the price list did not load", () => {
    assert.equal(formatOfferName(1, undefined), "—");
  });
});

describe("monthsSince", () => {
  it("counts whole months", () => {
    assert.equal(monthsSince("2026-03-28", "2026-10-28"), 7);
    assert.equal(monthsSince("2026-03-28", "2026-10-27"), 6);
    assert.equal(monthsSince("2025-12-15", "2026-01-15"), 1);
  });

  it("counts across the turn of the year and from the edge of the API range", () => {
    assert.equal(monthsSince("2025-12-31", "2026-01-31"), 1);
    assert.equal(monthsSince("2000-01-01", "2026-10-26"), 321);
  });

  it("is zero on the first day", () => {
    assert.equal(monthsSince("2026-10-26", "2026-10-26"), 0);
  });

  it("completes a month started on the 31st on the last day of a shorter month", () => {
    assert.equal(monthsSince("2026-01-31", "2026-02-28"), 1);
    assert.equal(monthsSince("2026-01-31", "2026-02-27"), 0);
  });

  it("never goes below zero for a future start", () => {
    assert.equal(monthsSince("2026-11-01", "2026-10-26"), 0);
  });
});

describe("formatMonthCount", () => {
  it("reads naturally for 0, 1 and more months", () => {
    assert.equal(formatMonthCount(0), "meno di un mese");
    assert.equal(formatMonthCount(1), "1 mese");
    assert.equal(formatMonthCount(7), "7 mesi");
  });
});

describe("totalPaidCents", () => {
  it("adds up the amounts", () => {
    const payment = (amountCents: number) => ({
      id: amountCents,
      amountCents,
      paidOn: "2026-10-01",
      method: "cash" as const,
      periods: 1,
      coversFrom: "2026-10-01",
      coversTo: "2026-11-01",
      note: null,
      canUndo: false,
      createdAt: "2026-10-01T00:00:00.000Z",
    });

    assert.equal(totalPaidCents([payment(8000), payment(7050)]), 15_050);
    assert.equal(totalPaidCents([]), 0);
    assert.equal(totalPaidCents([payment(0), payment(1_000_000), payment(1_000_000)]), 2_000_000);
  });
});

describe("offerLabel", () => {
  it("shows the name of an active offer", () => {
    assert.equal(offerLabel(offer(1, "Coaching mensile")), "Coaching mensile");
  });

  it("marks an archived offer", () => {
    assert.equal(
      offerLabel(offer(2, "Trimestrale", "2026-10-01T00:00:00.000Z")),
      "Trimestrale (archiviata)",
    );
  });
});
