import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { athleteNutritionFrom, mealPlanTodayFrom } from "./athleteNutrition";

const today = "2026-11-13";
const yesterday = "2026-11-12";
const updatedAt = new Date("2026-11-10T08:00:00.000Z");

const breakfast = { id: 11, name: "Colazione", timeOfDay: "07:30", position: 0 };
const lunch = { id: 12, name: "Pranzo", timeOfDay: "13:00", position: 1 };
const dinner = { id: 13, name: "Cena", timeOfDay: null, position: 2 };

const planWith = (fields: { isActive?: boolean; meals?: (typeof breakfast)[] } = {}) => ({
  id: 7,
  isActive: fields.isActive ?? true,
  updatedAt,
  meals: fields.meals ?? [breakfast, lunch, dinner],
});

const log = (mealId: number | null, status: "done" | "other", date = today) => ({
  mealId,
  date,
  status,
  note: null,
});

describe("athleteNutritionFrom", () => {
  it("is null without a plan, with a plan turned off, or with a plan without meals", () => {
    assert.equal(athleteNutritionFrom(null, today), null);
    assert.equal(athleteNutritionFrom({ mealPlan: planWith({ isActive: false }), logs: [] }, today), null);
    assert.equal(athleteNutritionFrom({ mealPlan: planWith({ meals: [] }), logs: [] }, today), null);
  });

  it("gives the first meal when nothing is logged today", () => {
    const logs = [log(breakfast.id, "done", yesterday)];

    assert.deepEqual(athleteNutritionFrom({ mealPlan: planWith(), logs }, today), {
      mealPlanId: 7,
      updatedAt,
      mealCount: 3,
      doneToday: 0,
      otherToday: 0,
      nextMeal: { id: 11, name: "Colazione", timeOfDay: "07:30" },
    });
  });

  it("counts today's done and other meals and skips logs of removed meals", () => {
    const logs = [log(breakfast.id, "done"), log(lunch.id, "other"), log(null, "done"), log(99, "done")];
    const nutrition = athleteNutritionFrom({ mealPlan: planWith(), logs }, today);

    assert.equal(nutrition?.doneToday, 1);
    assert.equal(nutrition?.otherToday, 1);
    assert.deepEqual(nutrition?.nextMeal, { id: 13, name: "Cena", timeOfDay: null });
  });

  it("has no next meal when every meal is logged", () => {
    const logs = [log(breakfast.id, "done"), log(lunch.id, "done"), log(dinner.id, "other")];

    assert.equal(athleteNutritionFrom({ mealPlan: planWith(), logs }, today)?.nextMeal, null);
  });
});

describe("mealPlanTodayFrom", () => {
  it("shows no plan without a plan or with a plan turned off", () => {
    const empty = { date: today, mealPlan: null, nextMealId: null };

    assert.deepEqual(mealPlanTodayFrom(null, today), empty);
    assert.deepEqual(mealPlanTodayFrom({ mealPlan: planWith({ isActive: false }), logs: [] }, today), empty);
  });

  it("puts today's log on each meal and gives the first meal still to log", () => {
    const breakfastLog = log(breakfast.id, "other");
    const logs = [breakfastLog, log(lunch.id, "done", yesterday)];
    const result = mealPlanTodayFrom({ mealPlan: planWith(), logs }, today);

    assert.equal(result.date, today);
    assert.equal(result.nextMealId, lunch.id);
    assert.deepEqual(
      result.mealPlan?.meals.map((meal) => meal.log),
      [breakfastLog, null, null],
    );
    assert.equal(result.mealPlan?.id, 7);
  });
});
