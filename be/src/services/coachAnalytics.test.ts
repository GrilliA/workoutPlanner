import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregatePortfolioWeeklySeries,
  countDistinctAlertAthletes,
} from "./coachAnalytics";
import type { CoachAlert } from "./analytics";

describe("aggregatePortfolioWeeklySeries", () => {
  it("sums metrics across athletes per week", () => {
    const result = aggregatePortfolioWeeklySeries([
      [
        {
          weekStart: "2026-08-04",
          weekEnd: "2026-08-10",
          sessionCount: 2,
          volumeKg: 3000,
        },
        {
          weekStart: "2026-08-11",
          weekEnd: "2026-08-17",
          sessionCount: 1,
          volumeKg: 1500,
        },
      ],
      [
        {
          weekStart: "2026-08-04",
          weekEnd: "2026-08-10",
          sessionCount: 1,
          volumeKg: 2000,
        },
      ],
    ]);

    assert.equal(result.length, 2);
    assert.deepEqual(result[0], {
      weekStart: "2026-08-04",
      weekEnd: "2026-08-10",
      sessionCount: 3,
      volumeKg: 5000,
    });
    assert.deepEqual(result[1], {
      weekStart: "2026-08-11",
      weekEnd: "2026-08-17",
      sessionCount: 1,
      volumeKg: 1500,
    });
  });

  it("returns empty array when no series provided", () => {
    assert.deepEqual(aggregatePortfolioWeeklySeries([]), []);
    assert.deepEqual(aggregatePortfolioWeeklySeries([[], []]), []);
  });
});

describe("countDistinctAlertAthletes", () => {
  it("counts unique athlete ids", () => {
    const alerts: CoachAlert[] = [
      {
        type: "inactive",
        severity: "medium",
        message: "A",
        athleteId: 1,
        athleteName: "Alice",
      },
      {
        type: "program_expiring",
        severity: "medium",
        message: "B",
        athleteId: 1,
        athleteName: "Alice",
      },
      {
        type: "program_expiring",
        severity: "medium",
        message: "C",
        athleteId: 2,
        athleteName: "Bob",
      },
    ];

    assert.equal(countDistinctAlertAthletes(alerts), 2);
    assert.equal(countDistinctAlertAthletes([]), 0);
  });
});
