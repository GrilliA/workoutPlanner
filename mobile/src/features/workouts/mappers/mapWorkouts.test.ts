import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AthleteHome, Workout } from "../../../api";
import { mapWorkouts } from "./mapWorkouts";

const makeWorkout = (overrides: Partial<Workout>): Workout => ({
  id: 1,
  name: "Scheda",
  defaultRestSec: 90,
  workoutType: "strength",
  frequency: "3",
  isActive: true,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  exerciseCount: 5,
  createdByUserId: 1,
  ...overrides,
});

const makeHome = (programs: AthleteHome["programs"]): AthleteHome => ({
  noProgramReason: null,
  programs,
  today: null,
  week: [],
  nextWorkout: null,
  sessionsLast7Days: 0,
  lastSession: null,
  hasUnseenAssignment: false,
});

const coachProgram: AthleteHome["programs"][number] = {
  workoutId: 7,
  name: "Full Body 3×",
  source: "coach",
  expiresAt: "2026-10-15",
  days: [
    { id: 11, name: "Push", weekdays: [0], exerciseCount: 4 },
    { id: 12, name: "Pull", weekdays: [2, 4], exerciseCount: 4 },
  ],
};

describe("mapWorkouts", () => {
  it("puts the coach program in use and pauses the athlete's own", () => {
    const model = mapWorkouts(
      makeHome([coachProgram]),
      [
        makeWorkout({ id: 7, createdByUserId: 9 }),
        makeWorkout({ id: 3, name: "Upper/Lower", exerciseCount: 1 }),
      ],
      1,
    );
    assert.equal(model.activeProgram?.sourceLabel, "dal coach");
    assert.equal(model.activeProgram?.validityLabel, "Valida fino al 15 ottobre");
    assert.deepEqual(
      model.activeProgram?.days.map((day) => day.weekdaysLabel),
      ["Lun", "Mer, Ven"],
    );
    assert.deepEqual(model.myWorkouts, [
      { workoutId: 3, name: "Upper/Lower", meta: "1 esercizio", status: "paused" },
    ]);
  });

  it("does not repeat the athlete's program in use in the list", () => {
    const selfProgram = { ...coachProgram, workoutId: 3, source: "self" as const, expiresAt: null };
    const model = mapWorkouts(
      makeHome([selfProgram]),
      [
        makeWorkout({ id: 3 }),
        makeWorkout({ id: 4, isActive: false, createdAt: new Date("2026-09-05T00:00:00Z") }),
      ],
      1,
    );
    assert.equal(model.activeProgram?.sourceLabel, "tua");
    assert.equal(model.activeProgram?.validityLabel, null);
    assert.deepEqual(
      model.myWorkouts.map((row) => [row.workoutId, row.status]),
      [[4, "inactive"]],
    );
  });

  it("has nothing in use without programs", () => {
    const model = mapWorkouts(makeHome([]), [], 1);
    assert.equal(model.activeProgram, null);
    assert.deepEqual(model.myWorkouts, []);
  });
});
