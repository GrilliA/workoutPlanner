import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAthleteHome,
  type AthleteHomeInput,
  type AthleteHomeSchedule,
  type AthleteHomeWorkout,
} from "./athleteHome";
import { addDaysToDateKey, getRomeWeekday, type ResolvedWorkoutDay } from "./workoutSchedule";

const USER_ID = 10;
const COACH_ID = 20;

// Wednesday 2026-09-23, Rome week Mon 21 → Sun 27.
const WEDNESDAY = {
  now: new Date("2026-09-23T10:00:00Z"),
  todayKey: "2026-09-23",
  weekStartKey: "2026-09-21",
};

const SUNDAY = {
  now: new Date("2026-09-27T10:00:00Z"),
  todayKey: "2026-09-27",
  weekStartKey: "2026-09-21",
};

const workout = (overrides: Partial<AthleteHomeWorkout> & { id: number }): AthleteHomeWorkout => ({
  name: `Scheda ${overrides.id}`,
  isActive: true,
  createdByUserId: USER_ID,
  createdAt: new Date("2026-09-01T10:00:00Z"),
  ...overrides,
});

const scheduled = (workoutDayId: number, workoutDayName: string): ResolvedWorkoutDay => ({
  workoutDayId,
  workoutDayName,
  source: "schedule",
});

const entries = (
  startKey: string,
  resolvedByDate: Record<string, ResolvedWorkoutDay> = {},
) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateKey(startKey, index);
    return {
      date,
      weekday: getRomeWeekday(new Date(`${date}T12:00:00Z`)),
      resolved: resolvedByDate[date] ?? null,
    };
  });

const schedule = (
  workoutId: number,
  clock: typeof WEDNESDAY,
  resolvedByDate: Record<string, ResolvedWorkoutDay> = {},
  today: ResolvedWorkoutDay | null = resolvedByDate[clock.todayKey] ?? null,
): AthleteHomeSchedule => ({
  workoutId,
  today,
  week: entries(clock.weekStartKey, resolvedByDate),
  nextDays: entries(addDaysToDateKey(clock.todayKey, 1), resolvedByDate),
});

const input = (overrides: Partial<AthleteHomeInput> = {}): AthleteHomeInput => ({
  userId: USER_ID,
  ...WEDNESDAY,
  workouts: [],
  activeAssignment: null,
  hasLinkedCoach: false,
  daysByWorkout: [],
  schedules: [],
  completedSessions: [],
  ...overrides,
});

describe("buildAthleteHome programs", () => {
  it("returns only the coach program with its expiry when an assignment is active", () => {
    const home = buildAthleteHome(
      input({
        hasLinkedCoach: true,
        workouts: [
          workout({ id: 1, createdByUserId: COACH_ID }),
          workout({ id: 2, createdAt: new Date("2026-09-10T10:00:00Z") }),
        ],
        activeAssignment: { workoutId: 1, expiresAt: "2026-10-31", seenAt: null },
        daysByWorkout: [
          {
            workoutId: 1,
            days: [{ id: 11, name: "Push", weekdays: [0, 3], exerciseCount: 5 }],
          },
        ],
        schedules: [schedule(1, WEDNESDAY)],
      }),
    );

    assert.deepEqual(home.programs, [
      {
        workoutId: 1,
        name: "Scheda 1",
        source: "coach",
        expiresAt: "2026-10-31",
        days: [{ id: 11, name: "Push", weekdays: [0, 3], exerciseCount: 5 }],
      },
    ]);
    assert.equal(home.noProgramReason, null);
  });

  it("lists active self programs newest first, skipping inactive and coach-created ones", () => {
    const home = buildAthleteHome(
      input({
        workouts: [
          workout({ id: 1, createdAt: new Date("2026-09-01T10:00:00Z") }),
          workout({ id: 2, createdAt: new Date("2026-09-05T10:00:00Z"), isActive: false }),
          workout({ id: 3, createdAt: new Date("2026-09-03T10:00:00Z"), createdByUserId: null }),
          workout({ id: 4, createdAt: new Date("2026-09-09T10:00:00Z"), createdByUserId: COACH_ID }),
        ],
      }),
    );

    assert.deepEqual(
      home.programs.map((program) => [program.workoutId, program.source, program.expiresAt]),
      [
        [3, "self", null],
        [1, "self", null],
      ],
    );
    assert.equal(home.noProgramReason, null);
  });
});

describe("buildAthleteHome noProgramReason", () => {
  it("is no-coach when no coach is linked", () => {
    const home = buildAthleteHome(input());

    assert.deepEqual(home.programs, []);
    assert.equal(home.noProgramReason, "no-coach");
  });

  it("is coach-pending when the coach has not assigned a program", () => {
    const home = buildAthleteHome(
      input({
        hasLinkedCoach: true,
        workouts: [workout({ id: 1, isActive: false })],
      }),
    );

    assert.equal(home.noProgramReason, "coach-pending");
  });

  it("is coach-program-inactive when the coach program is not active", () => {
    const home = buildAthleteHome(
      input({
        hasLinkedCoach: true,
        workouts: [workout({ id: 1, createdByUserId: COACH_ID, isActive: false })],
      }),
    );

    assert.equal(home.noProgramReason, "coach-program-inactive");
  });
});

describe("buildAthleteHome calendar", () => {
  it("picks today from the first program that resolves a day and uses its week", () => {
    const home = buildAthleteHome(
      input({
        workouts: [
          workout({ id: 1, createdAt: new Date("2026-09-10T10:00:00Z") }),
          workout({ id: 2, createdAt: new Date("2026-09-01T10:00:00Z") }),
        ],
        schedules: [
          schedule(1, WEDNESDAY, { "2026-09-21": scheduled(11, "Push") }),
          schedule(2, WEDNESDAY, {
            "2026-09-23": scheduled(21, "Legs"),
            "2026-09-25": scheduled(22, "Upper"),
          }),
        ],
      }),
    );

    assert.deepEqual(home.today, {
      date: "2026-09-23",
      workoutId: 2,
      workoutDayId: 21,
      workoutDayName: "Legs",
    });
    assert.equal(home.nextWorkout, null);
    assert.deepEqual(
      home.week.map((day) => [day.date, day.weekday, day.workoutDayId, day.workoutDayName]),
      [
        ["2026-09-21", 0, null, null],
        ["2026-09-22", 1, null, null],
        ["2026-09-23", 2, 21, "Legs"],
        ["2026-09-24", 3, null, null],
        ["2026-09-25", 4, 22, "Upper"],
        ["2026-09-26", 5, null, null],
        ["2026-09-27", 6, null, null],
      ],
    );
  });

  it("takes today from an override", () => {
    const override: ResolvedWorkoutDay = {
      workoutDayId: 12,
      workoutDayName: "Pull",
      source: "override",
    };
    const home = buildAthleteHome(
      input({
        workouts: [workout({ id: 1 })],
        schedules: [
          schedule(1, WEDNESDAY, { "2026-09-23": override }),
        ],
      }),
    );

    assert.deepEqual(home.today, {
      date: "2026-09-23",
      workoutId: 1,
      workoutDayId: 12,
      workoutDayName: "Pull",
    });
    assert.equal(home.week[2].workoutDayId, 12);
  });

  it("on a rest day shows the first program's week and the next workout", () => {
    const home = buildAthleteHome(
      input({
        workouts: [workout({ id: 1 })],
        schedules: [
          schedule(1, WEDNESDAY, {
            "2026-09-21": scheduled(11, "Push"),
            "2026-09-25": scheduled(12, "Pull"),
          }),
        ],
      }),
    );

    assert.equal(home.today, null);
    assert.deepEqual(home.nextWorkout, { date: "2026-09-25", workoutDayName: "Pull" });
    assert.equal(home.week[0].workoutDayName, "Push");
  });

  it("finds the next workout across the week boundary", () => {
    const home = buildAthleteHome(
      input({
        ...SUNDAY,
        workouts: [workout({ id: 1 })],
        schedules: [
          schedule(1, SUNDAY, {
            "2026-09-22": scheduled(12, "Pull"),
            "2026-09-29": scheduled(12, "Pull"),
          }),
        ],
      }),
    );

    assert.equal(home.today, null);
    assert.deepEqual(home.nextWorkout, { date: "2026-09-29", workoutDayName: "Pull" });
    assert.equal(home.week[1].workoutDayName, "Pull");
  });

  it("has no next workout when the next 7 days are all rest", () => {
    const home = buildAthleteHome(
      input({ workouts: [workout({ id: 1 })], schedules: [schedule(1, WEDNESDAY)] }),
    );

    assert.equal(home.today, null);
    assert.equal(home.nextWorkout, null);
  });

  it("returns a rest week when there are no programs", () => {
    const home = buildAthleteHome(input());

    assert.equal(home.today, null);
    assert.equal(home.nextWorkout, null);
    assert.deepEqual(
      home.week.map((day) => [day.date, day.workoutDayId]),
      [
        ["2026-09-21", null],
        ["2026-09-22", null],
        ["2026-09-23", null],
        ["2026-09-24", null],
        ["2026-09-25", null],
        ["2026-09-26", null],
        ["2026-09-27", null],
      ],
    );
  });
});

describe("buildAthleteHome sessions", () => {
  it("has no last session and zero recent sessions without history", () => {
    const home = buildAthleteHome(input());

    assert.equal(home.lastSession, null);
    assert.equal(home.sessionsLast7Days, 0);
  });

  it("counts sessions in the rolling 7-day window and returns the latest", () => {
    const home = buildAthleteHome(
      input({
        completedSessions: [
          {
            sessionId: 1,
            workoutDayName: "Push",
            completedAt: new Date("2026-09-10T10:00:00Z"),
            volumeKg: 1000,
          },
          {
            sessionId: 3,
            workoutDayName: "Legs",
            completedAt: new Date("2026-09-22T18:00:00Z"),
            volumeKg: 2450,
          },
          {
            sessionId: 2,
            workoutDayName: "Pull",
            completedAt: new Date("2026-09-17T09:00:00Z"),
            volumeKg: 1800,
          },
        ],
      }),
    );

    assert.equal(home.sessionsLast7Days, 2);
    assert.deepEqual(home.lastSession, {
      sessionId: 3,
      workoutDayName: "Legs",
      completedAt: "2026-09-22T18:00:00.000Z",
      volumeKg: 2450,
    });
  });

  it("keeps the last session when its workout day was deleted", () => {
    const home = buildAthleteHome(
      input({
        completedSessions: [
          {
            sessionId: 7,
            workoutDayName: null,
            completedAt: new Date("2026-09-20T10:00:00Z"),
            volumeKg: 0,
          },
        ],
      }),
    );

    assert.equal(home.lastSession?.workoutDayName, null);
    assert.equal(home.lastSession?.sessionId, 7);
  });
});

describe("buildAthleteHome hasUnseenAssignment", () => {
  const coachInput = (seenAt: Date | null) =>
    input({
      hasLinkedCoach: true,
      workouts: [workout({ id: 1, createdByUserId: COACH_ID })],
      activeAssignment: { workoutId: 1, expiresAt: "2026-10-31", seenAt },
    });

  it("is true when the active assignment has not been seen", () => {
    assert.equal(buildAthleteHome(coachInput(null)).hasUnseenAssignment, true);
  });

  it("is false once the active assignment has been seen", () => {
    assert.equal(
      buildAthleteHome(coachInput(new Date("2026-09-22T10:00:00Z"))).hasUnseenAssignment,
      false,
    );
  });

  it("is false without an active assignment", () => {
    assert.equal(buildAthleteHome(input()).hasUnseenAssignment, false);
  });
});
