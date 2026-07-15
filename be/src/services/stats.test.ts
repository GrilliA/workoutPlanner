import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addRomeDays,
  buildUserStats,
  computeSessionDurationMin,
  computeSessionVolumeKg,
  computeStreakDays,
  toRomeDateKey,
} from "./stats";

describe("computeSessionVolumeKg", () => {
  it("sums weight times reps for logged sets", () => {
    const volume = computeSessionVolumeKg([
      { weightKg: 100, reps: 5 },
      { weightKg: 80, reps: 8 },
      { weightKg: null, reps: 10 },
    ]);

    assert.equal(volume, 100 * 5 + 80 * 8);
  });
});

describe("computeStreakDays", () => {
  it("returns zero when the latest session is older than yesterday", () => {
    const now = new Date("2026-07-15T12:00:00");
    const streak = computeStreakDays([new Date("2026-07-10T18:00:00")], now);

    assert.equal(streak, 0);
  });

  it("counts consecutive Rome calendar days ending today", () => {
    const now = new Date("2026-07-15T18:00:00Z");
    const streak = computeStreakDays(
      [
        new Date("2026-07-15T07:00:00Z"),
        new Date("2026-07-14T20:00:00Z"),
        new Date("2026-07-13T19:00:00Z"),
      ],
      now,
    );

    assert.equal(streak, 3);
  });
});

describe("buildUserStats", () => {
  it("builds a seven-day breakdown aligned to Rome dates", () => {
    const now = new Date("2026-07-15T12:00:00Z");
    const stats = buildUserStats(
      [
        {
          sessionId: 1,
          workoutId: 1,
          workoutName: "Push",
          startedAt: new Date("2026-07-15T08:00:00Z"),
          completedAt: new Date("2026-07-15T09:00:00Z"),
        },
        {
          sessionId: 2,
          workoutId: 1,
          workoutName: "Pull",
          startedAt: new Date("2026-07-14T08:00:00Z"),
          completedAt: new Date("2026-07-14T09:00:00Z"),
        },
      ],
      [
        {
          sessionId: 1,
          sets: [{ weightKg: 100, reps: 5 }],
        },
        {
          sessionId: 2,
          sets: [{ weightKg: 60, reps: 10 }],
        },
      ],
      5,
      now,
    );

    assert.equal(stats.dailyBreakdown.length, 7);
    assert.equal(stats.totalSessions, 2);
    assert.equal(stats.volumeKg, 100 * 5 + 60 * 10);
    assert.equal(stats.averageSessionVolumeKg, Math.round((100 * 5 + 60 * 10) / 2));

    const todayKey = toRomeDateKey(now);
    const today = stats.dailyBreakdown.find((entry) => entry.date === todayKey);

    assert.ok(today);
    assert.equal(today.workoutCount, 1);
    assert.equal(today.volumeKg, 500);
  });
});

describe("computeSessionDurationMin", () => {
  it("returns at least one minute for completed sessions", () => {
    const duration = computeSessionDurationMin(
      new Date("2026-07-15T10:00:00Z"),
      new Date("2026-07-15T10:00:30Z"),
    );

    assert.equal(duration, 1);
  });
});

describe("addRomeDays", () => {
  it("shifts date keys without timezone drift", () => {
    assert.equal(addRomeDays("2026-07-15", -1), "2026-07-14");
    assert.equal(addRomeDays("2026-07-15", 2), "2026-07-17");
  });
});
