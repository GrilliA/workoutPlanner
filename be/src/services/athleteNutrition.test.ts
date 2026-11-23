import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { athleteNutritionFrom, mealPlanTodayFrom } from "./athleteNutrition";

const today = "2026-11-13";
const updatedAt = new Date("2026-11-10T08:00:00.000Z");

type Meal = { id: number; name: string; timeOfDay: string | null; position: number };

const breakfast: Meal = { id: 11, name: "Colazione", timeOfDay: "07:30", position: 0 };
const lunch: Meal = { id: 12, name: "Pranzo", timeOfDay: "13:00", position: 1 };
const dinner: Meal = { id: 13, name: "Cena", timeOfDay: null, position: 2 };

const planWith = (meals: Meal[] = [breakfast, lunch, dinner]) => ({ id: 7, updatedAt, meals });

// The loaders read the logs of one day: every log here is of `today`.
const log = (mealId: number | null, status: "done" | "other") => ({ mealId, date: today, status, note: null });

describe("athleteNutritionFrom", () => {
  it("is null without an active plan or with a plan without meals", () => {
    assert.equal(athleteNutritionFrom(null, today), null);
    assert.equal(athleteNutritionFrom({ mealPlan: planWith([]), logs: [] }, today), null);
  });

  it("gives the first meal when nothing is logged today", () => {
    assert.deepEqual(athleteNutritionFrom({ mealPlan: planWith(), logs: [] }, today), {
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
  it("shows no plan without an active plan", () => {
    assert.deepEqual(mealPlanTodayFrom(null, today), { date: today, mealPlan: null, nextMealId: null });
  });

  it("puts the log on each meal, keeps the plan's fields and gives the first meal still to log", () => {
    const breakfastLog = log(breakfast.id, "other");
    const result = mealPlanTodayFrom({ mealPlan: planWith(), logs: [breakfastLog] }, today);

    assert.equal(result.date, today);
    assert.equal(result.nextMealId, lunch.id);
    assert.deepEqual(
      result.mealPlan?.meals.map((meal) => meal.log),
      [breakfastLog, null, null],
    );
    assert.equal(result.mealPlan?.id, 7);
  });
});
