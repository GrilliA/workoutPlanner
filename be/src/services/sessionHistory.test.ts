import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSessionHistoryPage,
  parseSessionHistoryLimit,
  parseSessionHistoryPage,
} from "./sessionHistory";

describe("parseSessionHistoryPage", () => {
  it("defaults invalid values to page 1", () => {
    assert.equal(parseSessionHistoryPage(undefined), 1);
    assert.equal(parseSessionHistoryPage("0"), 1);
    assert.equal(parseSessionHistoryPage("2.5"), 1);
  });

  it("accepts positive integers", () => {
    assert.equal(parseSessionHistoryPage("3"), 3);
  });
});

describe("parseSessionHistoryLimit", () => {
  it("defaults invalid values to 10", () => {
    assert.equal(parseSessionHistoryLimit(undefined), 10);
    assert.equal(parseSessionHistoryLimit("-1"), 10);
  });

  it("caps the limit at 50", () => {
    assert.equal(parseSessionHistoryLimit("100"), 50);
  });
});

describe("buildSessionHistoryPage", () => {
  const sessions = [
    {
      sessionId: 1,
      workoutId: 10,
      workoutName: "Push",
      startedAt: new Date("2026-07-14T08:00:00Z"),
      completedAt: new Date("2026-07-14T09:00:00Z"),
    },
    {
      sessionId: 2,
      workoutId: 10,
      workoutName: "Push",
      startedAt: new Date("2026-07-15T08:00:00Z"),
      completedAt: new Date("2026-07-15T09:30:00Z"),
    },
    {
      sessionId: 3,
      workoutId: 11,
      workoutName: "Pull",
      startedAt: new Date("2026-07-13T08:00:00Z"),
      completedAt: new Date("2026-07-13T08:45:00Z"),
    },
  ];

  const sets = [
    { sessionId: 1, weightKg: 100, reps: 5 },
    { sessionId: 2, weightKg: 80, reps: 8 },
    { sessionId: 3, weightKg: 60, reps: 10 },
  ];

  it("returns the newest sessions first", () => {
    const page = buildSessionHistoryPage(sessions, sets, { page: 1, limit: 2 });

    assert.equal(page.items[0]?.sessionId, 2);
    assert.equal(page.items[1]?.sessionId, 1);
    assert.equal(page.total, 3);
    assert.equal(page.totalPages, 2);
  });

  it("paginates with offset", () => {
    const page = buildSessionHistoryPage(sessions, sets, { page: 2, limit: 2 });

    assert.equal(page.items.length, 1);
    assert.equal(page.items[0]?.sessionId, 3);
  });
});
