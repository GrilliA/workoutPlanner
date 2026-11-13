import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dailyAdherence, isLoggableDate, nextMealId } from "./mealPlan";

const breakfast = { id: 11, position: 0 };
const lunch = { id: 12, position: 1 };
const snack = { id: 13, position: 2 };
const dinner = { id: 14, position: 3 };
const meals = [breakfast, lunch, snack, dinner];
const day = "2026-11-13";

describe("nextMealId", () => {
  it("is the first meal when nothing is logged", () => {
    assert.equal(nextMealId({ meals, logs: [], date: day }), breakfast.id);
  });

  it("is the first meal in plan order without a log", () => {
    const logs = [
      { mealId: breakfast.id, date: day },
      { mealId: snack.id, date: day },
    ];

    assert.equal(nextMealId({ meals, logs, date: day }), lunch.id);
  });

  it("is null when every meal is logged", () => {
    const logs = meals.map((meal) => ({ mealId: meal.id, date: day }));

    assert.equal(nextMealId({ meals, logs, date: day }), null);
  });

  it("is null for a plan with no meals", () => {
    assert.equal(nextMealId({ meals: [], logs: [], date: day }), null);
  });

  it("ignores logs of other days", () => {
    const logs = [{ mealId: breakfast.id, date: "2026-11-12" }];

    assert.equal(nextMealId({ meals, logs, date: day }), breakfast.id);
  });

  it("ignores logs of removed meals", () => {
    const logs = [{ mealId: null, date: day }];

    assert.equal(nextMealId({ meals, logs, date: day }), breakfast.id);
  });

  it("follows position, not the order the meals arrive in", () => {
    const shuffled = [dinner, snack, breakfast, lunch];
    const logs = [{ mealId: breakfast.id, date: day }];

    assert.equal(nextMealId({ meals: shuffled, logs, date: day }), lunch.id);
  });

  it("breaks a tie on position with the lower id", () => {
    const firstAdded = { id: 31, position: 0 };
    const secondAdded = { id: 32, position: 0 };

    assert.equal(nextMealId({ meals: [secondAdded, firstAdded], logs: [], date: day }), firstAdded.id);
    assert.equal(
      nextMealId({ meals: [secondAdded, firstAdded], logs: [{ mealId: firstAdded.id, date: day }], date: day }),
      secondAdded.id,
    );
  });

  it("treats a meal logged as other like a done meal", () => {
    const logs = [{ mealId: breakfast.id, date: day, status: "other" as const }];

    assert.equal(nextMealId({ meals, logs, date: day }), lunch.id);
  });

  it("ignores a log for a meal that is not in the plan", () => {
    const logs = [{ mealId: 999, date: day }];

    assert.equal(nextMealId({ meals, logs, date: day }), breakfast.id);
  });

  it("does not reorder the meals it receives", () => {
    const shuffled = [dinner, breakfast];

    nextMealId({ meals: shuffled, logs: [], date: day });

    assert.deepEqual(shuffled, [dinner, breakfast]);
  });
});

describe("isLoggableDate", () => {
  it("accepts today and yesterday in Rome", () => {
    const now = new Date("2026-11-13T10:00:00Z");

    assert.equal(isLoggableDate("2026-11-13", now), true);
    assert.equal(isLoggableDate("2026-11-12", now), true);
  });

  it("refuses the day before yesterday and tomorrow", () => {
    const now = new Date("2026-11-13T10:00:00Z");

    assert.equal(isLoggableDate("2026-11-11", now), false);
    assert.equal(isLoggableDate("2026-11-14", now), false);
  });

  it("uses the Rome day just after midnight, while UTC is still on the day before", () => {
    // 00:30 in Rome (UTC+1) on 14 November.
    const justAfterMidnight = new Date("2026-11-13T23:30:00Z");

    assert.equal(isLoggableDate("2026-11-14", justAfterMidnight), true);
    assert.equal(isLoggableDate("2026-11-13", justAfterMidnight), true);
    assert.equal(isLoggableDate("2026-11-12", justAfterMidnight), false);
  });

  it("uses the Rome day just before midnight", () => {
    // 23:59 in Rome on 13 November.
    const justBeforeMidnight = new Date("2026-11-13T22:59:00Z");

    assert.equal(isLoggableDate("2026-11-13", justBeforeMidnight), true);
    assert.equal(isLoggableDate("2026-11-12", justBeforeMidnight), true);
    assert.equal(isLoggableDate("2026-11-14", justBeforeMidnight), false);
  });

  it("keeps the right days across the switch to summer time", () => {
    // Clocks go from 02:00 to 03:00 in Rome on 29 March 2026.
    const afterTheSwitch = new Date("2026-03-29T01:30:00Z");
    const firstSummerMidnight = new Date("2026-03-29T22:30:00Z");

    assert.equal(isLoggableDate("2026-03-29", afterTheSwitch), true);
    assert.equal(isLoggableDate("2026-03-28", afterTheSwitch), true);
    assert.equal(isLoggableDate("2026-03-30", firstSummerMidnight), true);
    assert.equal(isLoggableDate("2026-03-29", firstSummerMidnight), true);
    assert.equal(isLoggableDate("2026-03-28", firstSummerMidnight), false);
  });

  it("keeps the right days across the switch back to winter time", () => {
    // Clocks go from 03:00 back to 02:00 in Rome on 25 October 2026.
    const duringTheRepeatedHour = new Date("2026-10-25T00:30:00Z");
    const firstWinterMidnight = new Date("2026-10-25T23:30:00Z");

    assert.equal(isLoggableDate("2026-10-25", duringTheRepeatedHour), true);
    assert.equal(isLoggableDate("2026-10-24", duringTheRepeatedHour), true);
    assert.equal(isLoggableDate("2026-10-26", firstWinterMidnight), true);
    assert.equal(isLoggableDate("2026-10-25", firstWinterMidnight), true);
    assert.equal(isLoggableDate("2026-10-24", firstWinterMidnight), false);
  });

  it("accepts the last day of the previous month and year", () => {
    const newYearMorning = new Date("2027-01-01T08:00:00Z");

    assert.equal(isLoggableDate("2026-12-31", newYearMorning), true);
  });
});

describe("dailyAdherence", () => {
  const mealIds = meals.map((meal) => meal.id);

  it("returns one row per day with zero counts when nothing is logged", () => {
    const days = dailyAdherence({ from: "2026-11-11", to: "2026-11-13", mealIds, logs: [] });

    assert.deepEqual(days, [
      { date: "2026-11-11", mealCount: 4, doneCount: 0, otherCount: 0, removedCount: 0 },
      { date: "2026-11-12", mealCount: 4, doneCount: 0, otherCount: 0, removedCount: 0 },
      { date: "2026-11-13", mealCount: 4, doneCount: 0, otherCount: 0, removedCount: 0 },
    ]);
  });

  it("counts done and other on their own day", () => {
    const logs = [
      { mealId: breakfast.id, date: "2026-11-12", status: "done" as const },
      { mealId: lunch.id, date: "2026-11-12", status: "other" as const },
      ...meals.map((meal) => ({ mealId: meal.id, date: "2026-11-13", status: "done" as const })),
    ];

    const days = dailyAdherence({ from: "2026-11-12", to: "2026-11-13", mealIds, logs });

    assert.deepEqual(days, [
      { date: "2026-11-12", mealCount: 4, doneCount: 1, otherCount: 1, removedCount: 0 },
      { date: "2026-11-13", mealCount: 4, doneCount: 4, otherCount: 0, removedCount: 0 },
    ]);
  });

  it("never goes past the plan when the coach swaps meals after they were logged", () => {
    // Four meals logged, then the coach removes two (their logs lose meal_id) and adds two
    // the athlete logs as well: six logs for a plan of four meals.
    const brunch = { id: 21, position: 4 };
    const supper = { id: 22, position: 5 };
    const mealIdsNow = [breakfast.id, lunch.id, brunch.id, supper.id];
    const logs = [
      { mealId: breakfast.id, date: day, status: "done" as const },
      { mealId: lunch.id, date: day, status: "done" as const },
      { mealId: null, date: day, status: "done" as const },
      { mealId: null, date: day, status: "done" as const },
      { mealId: brunch.id, date: day, status: "done" as const },
      { mealId: supper.id, date: day, status: "other" as const },
    ];

    const [today] = dailyAdherence({ from: day, to: day, mealIds: mealIdsNow, logs });

    assert.deepEqual(today, { date: day, mealCount: 4, doneCount: 3, otherCount: 1, removedCount: 2 });
  });

  it("counts a log whose meal is not in the plan as removed", () => {
    const logs = [{ mealId: 999, date: day, status: "other" as const }];

    const [today] = dailyAdherence({ from: day, to: day, mealIds, logs });

    assert.deepEqual(today, { date: day, mealCount: 4, doneCount: 0, otherCount: 0, removedCount: 1 });
  });

  it("counts a meal once even if the same meal arrives twice", () => {
    const logs = [
      { mealId: breakfast.id, date: day, status: "done" as const },
      { mealId: breakfast.id, date: day, status: "other" as const },
    ];

    const [today] = dailyAdherence({ from: day, to: day, mealIds, logs });

    assert.equal(today?.doneCount, 1);
    assert.equal(today?.otherCount, 0);
  });

  it("ignores logs outside the range", () => {
    const logs = [{ mealId: breakfast.id, date: "2026-11-10", status: "done" as const }];

    const days = dailyAdherence({ from: day, to: day, mealIds, logs });

    assert.deepEqual(days, [{ date: day, mealCount: 4, doneCount: 0, otherCount: 0, removedCount: 0 }]);
  });

  it("walks across the change of hour without skipping or repeating a day", () => {
    const days = dailyAdherence({ from: "2026-10-24", to: "2026-10-26", mealIds, logs: [] });

    assert.deepEqual(
      days.map((row) => row.date),
      ["2026-10-24", "2026-10-25", "2026-10-26"],
    );
  });

  it("is empty when the range is inverted", () => {
    assert.deepEqual(dailyAdherence({ from: "2026-11-13", to: "2026-11-12", mealIds, logs: [] }), []);
  });
});
