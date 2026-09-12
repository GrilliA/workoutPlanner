import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoachAnalyticsOverview } from "../../../../api/schemas/coachAnalytics";
import { buildPortfolioWeeklyChart } from "./buildWeeklyChart";
import { mapCoachAnalytics } from "./mapCoachAnalytics";

const baseOverview = (): CoachAnalyticsOverview => ({
  range: "4w",
  period: { from: "2026-07-24", to: "2026-08-20" },
  clientCount: 3,
  athletesActiveInPeriod: 3,
  sessionsCompletedTotal: 15,
  clientsToReviewCount: 3,
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
    {
      type: "program_expiring",
      severity: "medium",
      message: "Programma in scadenza tra 3 giorni",
      athleteId: 10,
      athleteName: "Marco Rossi",
    },
    {
      type: "program_expiring",
      severity: "medium",
      message: "Programma in scadenza oggi",
      athleteId: 12,
      athleteName: "Sara Neri",
    },
    {
      type: "inactive",
      severity: "medium",
      message: "Nessuna sessione completata da 11 giorni",
      athleteId: 11,
      athleteName: "Luca Bianchi",
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
      lastSessionDate: "2026-08-09",
      sessionsCompleted: 4,
      alertCount: 1,
    },
    {
      athleteId: 12,
      athleteName: "Sara Neri",
      lastSessionDate: "2026-08-19",
      sessionsCompleted: 6,
      alertCount: 1,
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
  it("maps KPIs and keeps inactive plus expiring signals on the same row", () => {
    const view = mapCoachAnalytics(baseOverview());
    const marco = view.alertRows.find((row) => row.athleteId === 10);
    const sara = view.alertRows.find((row) => row.athleteId === 12);

    assert.equal(view.kpis.length, 4);
    assert.equal(view.kpis[1]?.value, "3");
    assert.equal(view.kpis[2]?.value, "3");
    assert.equal(view.alertRows.length, 3);
    assert.deepEqual(
      view.alertRows.map((row) => row.athleteId),
      [10, 12, 11],
    );
    assert.deepEqual(
      marco?.signals.map((signal) => signal.kind),
      ["program_expiring", "inactive"],
    );
    assert.equal(marco?.signals[0]?.label, "In scadenza");
    assert.equal(marco?.href, "/clients/10");
    assert.equal(marco?.sessionsLabel, "5");
    assert.deepEqual(
      sara?.signals.map((signal) => signal.kind),
      ["program_expiring"],
    );
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
