import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDaysToDateKey,
  getRomeWeekday,
  parseScheduledDate,
  pickWorkoutDayForDate,
  toRomeDateKey,
} from "./workoutSchedule";

describe("parseScheduledDate", () => {
  it("accepts YYYY-MM-DD strings", () => {
    assert.equal(parseScheduledDate("2026-07-15"), "2026-07-15");
  });

  it("rejects invalid values", () => {
    assert.equal(parseScheduledDate("15-07-2026"), null);
    assert.equal(parseScheduledDate(null), null);
  });
});

describe("getRomeWeekday", () => {
  it("maps Rome weekdays with Monday as zero", () => {
    assert.equal(getRomeWeekday(new Date("2026-07-13T12:00:00Z")), 0);
    assert.equal(getRomeWeekday(new Date("2026-07-19T12:00:00Z")), 6);
  });
});

describe("toRomeDateKey", () => {
  it("formats dates in the Europe/Rome calendar", () => {
    assert.equal(toRomeDateKey(new Date("2026-07-14T22:30:00Z")), "2026-07-15");
  });
});

describe("addDaysToDateKey", () => {
  it("adds days across month and year boundaries", () => {
    assert.equal(addDaysToDateKey("2026-01-31", 1), "2026-02-01");
    assert.equal(addDaysToDateKey("2025-12-31", 1), "2026-01-01");
    assert.equal(addDaysToDateKey("2026-07-13", 7), "2026-07-20");
  });

  it("crosses Europe/Rome DST boundaries without drifting", () => {
    assert.equal(addDaysToDateKey("2026-03-29", 1), "2026-03-30");
    assert.equal(addDaysToDateKey("2026-10-25", 1), "2026-10-26");
  });
});

describe("pickWorkoutDayForDate", () => {
  const baseInput = {
    dateKey: "2026-07-14",
    weekday: 1 as const,
    overrides: [],
    weekdayDays: [],
    days: [
      { id: 10, name: "Giorno A" },
      { id: 20, name: "Giorno B" },
    ],
  };

  it("prefers an override over the weekday schedule", () => {
    const resolved = pickWorkoutDayForDate({
      ...baseInput,
      overrides: [
        {
          scheduledDate: "2026-07-14",
          workoutDayId: 20,
          workoutDayName: "Giorno B",
        },
      ],
      weekdayDays: [
        {
          weekday: 1,
          workoutDayId: 10,
          workoutDayName: "Giorno A",
          sortOrder: 0,
        },
      ],
    });

    assert.deepEqual(resolved, {
      workoutDayId: 20,
      workoutDayName: "Giorno B",
      source: "override",
    });
  });

  it("breaks weekday ties by sortOrder then workoutDayId", () => {
    const resolved = pickWorkoutDayForDate({
      ...baseInput,
      weekdayDays: [
        {
          weekday: 1,
          workoutDayId: 20,
          workoutDayName: "Giorno B",
          sortOrder: 1,
        },
        {
          weekday: 1,
          workoutDayId: 10,
          workoutDayName: "Giorno A",
          sortOrder: 0,
        },
        {
          weekday: 1,
          workoutDayId: 5,
          workoutDayName: "Giorno C",
          sortOrder: 0,
        },
      ],
    });

    assert.deepEqual(resolved, {
      workoutDayId: 5,
      workoutDayName: "Giorno C",
      source: "schedule",
    });
  });

  it("falls back to the single day when nothing matches", () => {
    const resolved = pickWorkoutDayForDate({
      ...baseInput,
      days: [{ id: 30, name: "Unico" }],
    });

    assert.deepEqual(resolved, {
      workoutDayId: 30,
      workoutDayName: "Unico",
      source: "default",
    });
  });

  it("returns null when a multi-day workout has no match", () => {
    assert.equal(pickWorkoutDayForDate(baseInput), null);
  });
});
