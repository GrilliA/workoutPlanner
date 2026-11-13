import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoachBusiness } from "../../../../api/schemas/business.ts";
import {
  buildCollectedChart,
  buildLostSummary,
  buildRenewalsSummary,
  formatCompactEuros,
  formatLongMonth,
  formatShortMonth,
  mapCoachBusiness,
} from "./business.ts";

const NBSP = " ";

const business: CoachBusiness = {
  range: "6m",
  today: "2026-11-13",
  subscriptionCount: 3,
  monthlyRecurringCents: 18833,
  recurringClientCount: 2,
  expectedNext30DaysCents: 8000,
  collectedByMonth: [
    { month: "2026-06", amountCents: 0 },
    { month: "2026-07", amountCents: 8000 },
    { month: "2026-08", amountCents: 16000 },
    { month: "2026-09", amountCents: 0 },
    { month: "2026-10", amountCents: 4000 },
    { month: "2026-11", amountCents: 8050 },
  ],
  renewals90Days: { due: 4, renewed: 3 },
  lostByMonth: [
    { month: "2026-06", count: 0 },
    { month: "2026-07", count: 0 },
    { month: "2026-08", count: 0 },
    { month: "2026-09", count: 0 },
    { month: "2026-10", count: 1 },
    { month: "2026-11", count: 0 },
  ],
};

describe("month labels", () => {
  it("short and long Italian names, never moved by the time zone", () => {
    assert.equal(formatShortMonth("2026-06"), "giu");
    assert.equal(formatShortMonth("2027-01"), "gen");
    assert.equal(formatLongMonth("2026-06"), "giugno 2026");
  });
});

describe("formatCompactEuros", () => {
  it("whole euros under 1000, thousands with one decimal and k", () => {
    assert.equal(formatCompactEuros(0), `0${NBSP}€`);
    assert.equal(formatCompactEuros(8050), `81${NBSP}€`);
    assert.equal(formatCompactEuros(99949), `999${NBSP}€`);
    assert.equal(formatCompactEuros(120000), `1,2k${NBSP}€`);
    assert.equal(formatCompactEuros(1250000), `12,5k${NBSP}€`);
    assert.equal(formatCompactEuros(1000000), `10k${NBSP}€`);
  });
});

describe("buildCollectedChart", () => {
  it("heights against the best month, the current month marked, a zero month flat", () => {
    const chart = buildCollectedChart(business);
    assert.deepEqual(
      chart.bars.map((bar) => bar.heightRatio),
      [0, 0.5, 1, 0, 0.25, 8050 / 16000],
    );
    assert.deepEqual(
      chart.bars.map((bar) => bar.isCurrentMonth),
      [false, false, false, false, false, true],
    );
    assert.equal(chart.bars[5]?.accessibilityLabel, `novembre 2026: 80,50${NBSP}€`);
    assert.equal(chart.bars[5]?.compactAmount, `81${NBSP}€`);
    assert.equal(chart.bars[5]?.amount, `80,50${NBSP}€`);
    assert.equal(chart.summary, `360,50${NBSP}€ incassati negli ultimi 6 mesi.`);
  });

  it("no payments: every bar flat and a plain summary", () => {
    const empty = { ...business, collectedByMonth: business.collectedByMonth.map((entry) => ({ ...entry, amountCents: 0 })) };
    const chart = buildCollectedChart(empty);
    assert.ok(chart.bars.every((bar) => bar.heightRatio === 0));
    assert.equal(chart.summary, "Nessun pagamento segnato negli ultimi 6 mesi.");
  });
});

describe("buildRenewalsSummary", () => {
  it("clients renewed on clients due, with the rounded percentage", () => {
    assert.deepEqual(buildRenewalsSummary({ due: 3, renewed: 2 }), {
      value: "67%",
      hint: "2 clienti su 3 hanno rinnovato negli ultimi 90 giorni",
    });
  });

  it("one client is singular; none says nobody", () => {
    assert.equal(buildRenewalsSummary({ due: 2, renewed: 1 }).hint, "1 cliente su 2 ha rinnovato negli ultimi 90 giorni");
    assert.deepEqual(buildRenewalsSummary({ due: 2, renewed: 0 }), {
      value: "0%",
      hint: "Nessun cliente su 2 ha rinnovato negli ultimi 90 giorni",
    });
  });

  it("no clients due: no percentage", () => {
    assert.deepEqual(buildRenewalsSummary({ due: 0, renewed: 0 }), {
      value: null,
      hint: "Nessun cliente con una scadenza negli ultimi 90 giorni.",
    });
  });
});

describe("buildLostSummary", () => {
  it("total of the range and one entry per month", () => {
    const lost = buildLostSummary({ ...business, range: "12m" });
    assert.equal(lost.total, "1 cliente negli ultimi 12 mesi");
    assert.deepEqual(lost.months[4], { label: "ott", count: "1" });
    assert.equal(lost.months.length, 6);
  });
});

describe("mapCoachBusiness", () => {
  it("kpis in euros; empty only without subscriptions", () => {
    const view = mapCoachBusiness(business);
    assert.equal(view.isEmpty, false);
    assert.deepEqual(
      view.kpis.map((kpi) => [kpi.label, kpi.value, kpi.hint]),
      [
        ["Entrate ricorrenti", `188,33${NBSP}€`, "al mese, da 2 clienti"],
        ["Atteso", `80${NBSP}€`, "rinnovi nei prossimi 30 giorni"],
        ["Incassato questo mese", `80,50${NBSP}€`, "pagamenti segnati nel mese"],
      ],
    );
    assert.equal(mapCoachBusiness({ ...business, subscriptionCount: 0 }).isEmpty, true);
  });

  it("one recurring client is singular", () => {
    const view = mapCoachBusiness({ ...business, recurringClientCount: 1 });
    assert.equal(view.kpis[0]?.hint, "al mese, da 1 cliente");
  });
});
