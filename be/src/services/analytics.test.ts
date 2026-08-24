import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAnalyticsSummary,
  buildCoachAlerts,
  buildRangePeriods,
  computeE1RM,
  parseStatsRange,
} from "./analytics";

describe("parseStatsRange", () => {
  it("accepts supported ranges", () => {
    assert.equal(parseStatsRange("4w"), "4w");
    assert.equal(parseStatsRange("52w"), "52w");
  });

  it("rejects invalid values", () => {
    assert.equal(parseStatsRange("7d"), null);
    assert.equal(parseStatsRange(undefined), null);
  });
});

describe("computeE1RM", () => {
  it("uses Epley formula for valid weighted sets", () => {
    assert.equal(computeE1RM(100, 5), 116.7);
  });

  it("returns null for bodyweight or zero load", () => {
    assert.equal(computeE1RM(null, 10), null);
    assert.equal(computeE1RM(0, 10), null);
  });

  it("returns null for reps outside 1-12", () => {
    assert.equal(computeE1RM(100, 0), null);
    assert.equal(computeE1RM(100, 13), null);
  });
});

describe("buildRangePeriods", () => {
  it("builds current and previous 4-week windows", () => {
    const periods = buildRangePeriods("4w", "2026-08-20");

    assert.deepEqual(periods.current, { from: "2026-07-24", to: "2026-08-20" });
    assert.deepEqual(periods.previous, { from: "2026-06-26", to: "2026-07-23" });
  });
});

describe("buildAnalyticsSummary", () => {
  it("counts completed sessions and volume without planned adherence", () => {
    const summary = buildAnalyticsSummary({
      range: "4w",
      sessions: [
        {
          sessionId: 1,
          workoutId: 1,
          workoutName: "Push",
          startedAt: new Date("2026-08-18T08:00:00Z"),
          completedAt: new Date("2026-08-18T09:00:00Z"),
        },
        {
          sessionId: 2,
          workoutId: 1,
          workoutName: "Extra",
          startedAt: new Date("2026-08-19T08:00:00Z"),
          completedAt: new Date("2026-08-19T09:00:00Z"),
        },
      ],
      setsBySession: [
        { sessionId: 1, sets: [{ weightKg: 100, reps: 5 }] },
        { sessionId: 2, sets: [{ weightKg: 60, reps: 8 }] },
      ],
      setsBySessionWithExercise: [
        {
          sessionId: 1,
          sets: [{ exerciseId: 1, weightKg: 100, reps: 5 }],
        },
      ],
      now: new Date("2026-08-20T12:00:00Z"),
    });

    assert.equal(summary.sessionsCompleted, 2);
    assert.equal(summary.volumeKg, 980);
    assert.equal(summary.prCount, 1);
    assert.equal(summary.weeklySeries.every((week) => "plannedCount" in week), false);
  });

  it("returns zero sessions when none fall in range", () => {
    const summary = buildAnalyticsSummary({
      range: "4w",
      sessions: [],
      setsBySession: [],
      now: new Date("2026-08-20T12:00:00Z"),
    });

    assert.equal(summary.sessionsCompleted, 0);
    assert.equal(summary.volumeKg, 0);
    assert.equal(summary.prCount, 0);
  });
});

describe("buildCoachAlerts", () => {
  it("creates inactivity and program expiry alerts only", () => {
    const alerts = buildCoachAlerts({
      athleteId: 2,
      athleteName: "Sara",
      lastSessionDate: "2026-08-01",
      programExpiresAt: "2026-08-22",
      today: "2026-08-20",
    });

    assert.ok(alerts.some((alert) => alert.type === "inactive"));
    assert.ok(alerts.some((alert) => alert.type === "program_expiring"));
    assert.equal(alerts.some((alert) => (alert.type as string) === "low_adherence"), false);
  });

  it("flags athletes who never trained", () => {
    const alerts = buildCoachAlerts({
      athleteId: 1,
      athleteName: "Luca",
      lastSessionDate: null,
      programExpiresAt: null,
      today: "2026-08-20",
    });

    assert.equal(alerts.length, 1);
    assert.equal(alerts[0]?.type, "inactive");
  });

  it("skips inactivity when last session is recent", () => {
    const alerts = buildCoachAlerts({
      athleteId: 1,
      athleteName: "Luca",
      lastSessionDate: "2026-08-18",
      programExpiresAt: null,
      today: "2026-08-20",
    });

    assert.equal(alerts.length, 0);
  });
});
