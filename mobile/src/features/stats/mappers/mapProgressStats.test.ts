import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AthleteAnalytics } from "../../api";
import { buildWeeklyChartModel } from "./buildWeeklyChart";
import { mapProgressInsight, mapProgressStats } from "./mapProgressStats";
import { formatPeriodBounds, formatSignedPercent } from "./formatters";

const baseAnalytics = (): AthleteAnalytics => ({
  range: "4w",
  period: { from: "2026-07-24", to: "2026-08-20" },
  previousPeriod: { from: "2026-06-26", to: "2026-07-23" },
  sessionsCompleted: 6,
  volumeKg: 12000,
  previousVolumeKg: 10000,
  volumeChangePct: 20,
  streakDays: 3,
  prCount: 2,
  weeklySeries: [
    {
      weekStart: "2026-07-24",
      weekEnd: "2026-07-30",
      sessionCount: 2,
      volumeKg: 4000,
    },
    {
      weekStart: "2026-07-31",
      weekEnd: "2026-08-06",
      sessionCount: 0,
      volumeKg: 0,
    },
  ],
  exerciseProgressions: [],
  recentSessions: [],
});

describe("mapProgressStats", () => {
  it("builds session, PR and streak KPIs", () => {
    const view = mapProgressStats(baseAnalytics());
    assert.deepEqual(
      view.kpis.map((kpi) => kpi.id),
      ["sessions", "pr", "streak"],
    );
    assert.equal(view.kpis.find((kpi) => kpi.id === "streak")?.value, "3");
    assert.match(view.insight, /6 sessioni/i);
    assert.doesNotMatch(view.insight, /aderenza/i);
  });

  it("returns neutral insight without sessions", () => {
    const insight = mapProgressInsight({
      ...baseAnalytics(),
      sessionsCompleted: 0,
      weeklySeries: [],
      volumeChangePct: null,
      prCount: 0,
      streakDays: 0,
    });
    assert.match(insight, /Non ci sono abbastanza sessioni/i);
  });
});

describe("buildWeeklyChartModel", () => {
  it("summarizes active weeks", () => {
    const chart = buildWeeklyChartModel(baseAnalytics());
    assert.equal(chart.bars.length, 2);
    assert.match(chart.summary, /2 sessioni in 1 settimane attive su 2/i);
  });

  it("marks 52-week charts as scrollable with sparse labels", () => {
    const chart = buildWeeklyChartModel({
      ...baseAnalytics(),
      range: "52w",
      weeklySeries: Array.from({ length: 52 }, (_, index) => ({
        weekStart: `2025-${String((index % 12) + 1).padStart(2, "0")}-01`,
        weekEnd: `2025-${String((index % 12) + 1).padStart(2, "0")}-07`,
        sessionCount: index % 5,
        volumeKg: 1000,
      })),
    });

    assert.equal(chart.scrollable, true);
    assert.equal(chart.bars.length, 52);
    assert.equal(chart.bars.filter((bar) => bar.showLabel).length < 52, true);
    assert.equal(chart.bars[0]?.showLabel, true);
    assert.equal(chart.bars.at(-1)?.showLabel, true);
  });
});

describe("formatters", () => {
  it("formats signed volume trend copy", () => {
    assert.match(formatSignedPercent(12.5), /\+12,5%/);
    assert.equal(formatSignedPercent(null), "Dati insufficienti");
  });

  it("formats period bounds in Italian locale", () => {
    const label = formatPeriodBounds("2026-07-24", "2026-08-20");
    assert.match(label, /24/);
    assert.match(label, /20/);
  });
});
