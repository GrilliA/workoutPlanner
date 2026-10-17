import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AthleteHome } from "../../../api";
import {
  buildWorkoutChoices,
  describeSelection,
  formatExerciseCount,
  hasAnyWorkoutDay,
  resolveSelection,
  weekWorkoutId,
} from "./homeSelection";

const makeHome = (overrides: Partial<AthleteHome> = {}): AthleteHome => ({
  noProgramReason: null,
  programs: [
    {
      workoutId: 7,
      name: "Full Body 3×",
      source: "coach",
      expiresAt: "2026-12-31",
      days: [
        { id: 11, name: "Push", weekdays: [0], exerciseCount: 4 },
        { id: 12, name: "Pull", weekdays: [2, 4], exerciseCount: 1 },
      ],
    },
    {
      workoutId: 8,
      name: "Corsa",
      source: "self",
      expiresAt: null,
      days: [{ id: 21, name: "Lento", weekdays: [], exerciseCount: 2 }],
    },
  ],
  today: {
    date: "2026-10-19",
    workoutId: 7,
    workoutDayId: 11,
    workoutDayName: "Push",
  },
  week: [],
  nextWorkout: null,
  sessionsLast7Days: 0,
  lastSession: null,
  hasUnseenAssignment: false,
  ...overrides,
});

describe("resolveSelection", () => {
  it("uses today when the athlete has not chosen", () => {
    assert.deepEqual(resolveSelection(makeHome(), null), {
      workoutId: 7,
      workoutDayId: 11,
    });
  });

  it("keeps the athlete's choice while it still exists", () => {
    const chosen = { workoutId: 8, workoutDayId: 21 };
    assert.deepEqual(resolveSelection(makeHome(), chosen), chosen);
  });

  it("falls back to today when the chosen day was removed", () => {
    const chosen = { workoutId: 7, workoutDayId: 99 };
    assert.deepEqual(resolveSelection(makeHome(), chosen), {
      workoutId: 7,
      workoutDayId: 11,
    });
  });

  it("is null on a rest day with no choice", () => {
    assert.equal(resolveSelection(makeHome({ today: null }), null), null);
  });
});

describe("describeSelection", () => {
  it("marks today's day", () => {
    const described = describeSelection(makeHome(), {
      workoutId: 7,
      workoutDayId: 11,
    });
    assert.deepEqual(described, {
      programName: "Full Body 3×",
      dayName: "Push",
      exerciseCount: 4,
      isToday: true,
    });
  });

  it("marks a day chosen by the athlete as not today", () => {
    const described = describeSelection(makeHome(), {
      workoutId: 7,
      workoutDayId: 12,
    });
    assert.equal(described?.isToday, false);
    assert.equal(described?.dayName, "Pull");
  });

  it("is null for a day that does not exist", () => {
    assert.equal(
      describeSelection(makeHome(), { workoutId: 9, workoutDayId: 11 }),
      null,
    );
  });
});

describe("weekWorkoutId", () => {
  it("follows today's program", () => {
    const home = makeHome({
      today: { date: "2026-10-19", workoutId: 8, workoutDayId: 21, workoutDayName: "Lento" },
    });
    assert.equal(weekWorkoutId(home), 8);
  });

  it("uses the first program on a rest day", () => {
    assert.equal(weekWorkoutId(makeHome({ today: null })), 7);
  });

  it("is null without programs", () => {
    assert.equal(weekWorkoutId(makeHome({ today: null, programs: [] })), null);
  });
});

describe("buildWorkoutChoices", () => {
  it("lists every day with its weekdays and exercises", () => {
    const sections = buildWorkoutChoices(makeHome().programs);
    assert.equal(sections.length, 2);
    assert.deepEqual(sections[0]?.rows, [
      { workoutDayId: 11, name: "Push", meta: "Lunedì · 4 esercizi" },
      { workoutDayId: 12, name: "Pull", meta: "Mercoledì, Venerdì · 1 esercizio" },
    ]);
    assert.deepEqual(sections[1]?.rows, [
      { workoutDayId: 21, name: "Lento", meta: "2 esercizi" },
    ]);
  });

  it("skips programs without days", () => {
    const selfProgram = makeHome().programs.find((program) => program.workoutId === 8);
    assert.ok(selfProgram);
    const programs = [{ ...selfProgram, days: [] }];
    assert.deepEqual(buildWorkoutChoices(programs), []);
    assert.equal(hasAnyWorkoutDay(programs), false);
  });
});

describe("formatExerciseCount", () => {
  it("uses the singular for one exercise", () => {
    assert.equal(formatExerciseCount(1), "1 esercizio");
    assert.equal(formatExerciseCount(0), "0 esercizi");
  });
});
