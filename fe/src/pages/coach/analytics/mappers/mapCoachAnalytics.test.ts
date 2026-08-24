import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoachAnalyticsOverview } from "../../../../api/schemas/coachAnalytics";
import { buildPortfolioWeeklyChart } from "./buildWeeklyChart";
import { mapCoachAnalytics } from "./mapCoachAnalytics";

const baseOverview = (): CoachAnalyticsOverview => ({
  range: "4w",
  period: { from: "2026-07-24", to: "2026-08-20" },
  clientCount: 2,
  athletesActiveInPeriod: 2,
  sessionsCompletedTotal: 9,
  clientsToReviewCount: 1,
  weeklySeries: [
    {
      weekStart: "2026-07-24",
      weekEnd: "2026-07-30",
      sessionCount: 3,
      volumeKg: 4500,
    },
    {
      weekStart: "2026-07-31",
      weekEnd: "2026-08-06",
      sessionCount: 2,
      volumeKg: 3000,
    },
  ],
  alerts: [
    {
      type: "inactive",
      severity: "medium",
      message: "Nessuna sessione completata da 8 giorni",
      athleteId: 10,
      athleteName: "Marco Rossi",
    },
  ],
  clients: [
    {
      athleteId: 10,
      athleteName: "Marco Rossi",
      lastSessionDate: "2026-08-12",
      sessionsCompleted: 5,
      alertCount: 1,
    },
    {
      athleteId: 11,
      athleteName: "Luca Bianchi",
      lastSessionDate: "2026-08-18",
      sessionsCompleted: 4,
      alertCount: 0,
    },
  ],
});

describe("buildPortfolioWeeklyChart", () => {
  it("builds accessible bars from weekly series", () => {
    const model = buildPortfolioWeeklyChart({
      range: "4w",
      weeklySeries: baseOverview().weeklySeries,
    });

    assert.equal(model.bars.length, 2);
    assert.equal(model.bars[0]?.sessionValue, 3);
    assert.equal(model.hasVolume, true);
    assert.match(model.summary, /5 sessioni/);
  });
});

describe("mapCoachAnalytics", () => {
  it("maps KPIs and deduplicates alert rows per athlete", () => {
    const view = mapCoachAnalytics(baseOverview());

    assert.equal(view.kpis.length, 4);
    assert.equal(view.kpis[1]?.value, "2");
    assert.equal(view.kpis[2]?.value, "1");
    assert.equal(view.alertRows.length, 1);
    assert.equal(view.alertRows[0]?.extraReasons, 0);
    assert.equal(view.alertRows[0]?.severity, "medium");
    assert.equal(view.alertRows[0]?.href, "/clients/10");
    assert.equal(view.alertRows[0]?.sessionsLabel, "5");
  });

  it("handles empty portfolio", () => {
    const view = mapCoachAnalytics({
      ...baseOverview(),
      clientCount: 0,
      athletesActiveInPeriod: 0,
      clientsToReviewCount: 0,
      sessionsCompletedTotal: 0,
      weeklySeries: [],
      alerts: [],
      clients: [],
    });

    assert.equal(view.isEmpty, true);
    assert.equal(view.hasAlerts, false);
    assert.equal(view.weeklyChart.bars.length, 0);
  });
});
