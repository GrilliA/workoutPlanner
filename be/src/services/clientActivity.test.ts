import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { trainingFrequency } from "./clientActivity";

const today = "2026-10-26";

describe("trainingFrequency", () => {
  it("counts a session completed today", () => {
    const frequency = trainingFrequency({ completedOn: [today], workoutDayCount: null, today });

    assert.equal(frequency.completedSessions, 1);
  });

  it("counts the session 13 days ago and not the one 14 days ago", () => {
    const frequency = trainingFrequency({
      completedOn: ["2026-10-13", "2026-10-12"],
      workoutDayCount: null,
      today,
    });

    assert.equal(frequency.completedSessions, 1);
  });

  it("does not count a session after today", () => {
    const frequency = trainingFrequency({
      completedOn: ["2026-10-27"],
      workoutDayCount: null,
      today,
    });

    assert.equal(frequency.completedSessions, 0);
  });

  it("counts two sessions on the same day as two", () => {
    const frequency = trainingFrequency({
      completedOn: ["2026-10-20", "2026-10-20"],
      workoutDayCount: null,
      today,
    });

    assert.equal(frequency.completedSessions, 2);
  });

  it("expects nothing without an active program", () => {
    const frequency = trainingFrequency({ completedOn: [], workoutDayCount: null, today });

    assert.deepEqual(frequency, { completedSessions: 0, expectedSessions: null });
  });

  it("expects nothing when the active program has no days", () => {
    const frequency = trainingFrequency({ completedOn: [today], workoutDayCount: 0, today });

    assert.deepEqual(frequency, { completedSessions: 1, expectedSessions: null });
  });

  it("expects the program days twice, one per week of the window", () => {
    const frequency = trainingFrequency({ completedOn: [], workoutDayCount: 3, today });

    assert.deepEqual(frequency, { completedSessions: 0, expectedSessions: 6 });
  });
});
