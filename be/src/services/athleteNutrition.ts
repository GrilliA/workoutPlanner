import type { MealLogStatus } from "../db/schema/meallogs";
import { dailyAdherence, nextMealId } from "./mealPlan";

type MealOfDay = {
  id: number;
  name: string;
  timeOfDay: string | null;
  position: number;
};

/** A log of the day the plan was read for: the loaders read one day only. */
type LogOfDay = {
  mealId: number | null;
  date: string;
  status: MealLogStatus;
};

/** What the athlete home needs to show the Allenamento / Alimentazione switch and today's next meal. */
export type AthleteNutrition = {
  mealPlanId: number;
  updatedAt: Date;
  mealCount: number;
  doneToday: number;
  otherToday: number;
  nextMeal: { id: number; name: string; timeOfDay: string | null } | null;
};

/**
 * The active plan of the linked coach with today's logs, as `loadActiveMealPlanSummary` reads it.
 * `null` hides the switch: no active plan (no coach, no plan, plan turned off), or a plan with
 * no meals. Today's counts walk the plan's meals like the coach's adherence, so they never
 * count a removed meal.
 */
export const athleteNutritionFrom = (
  day: { mealPlan: { id: number; updatedAt: Date; meals: MealOfDay[] }; logs: LogOfDay[] } | null,
  today: string,
): AthleteNutrition | null => {
  if (day === null || day.mealPlan.meals.length === 0) {
    return null;
  }

  const { mealPlan } = day;
  const mealIds = mealPlan.meals.map((meal) => meal.id);
  const [todayAdherence] = dailyAdherence({ from: today, to: today, mealIds, logs: day.logs });
  const nextId = nextMealId({ meals: mealPlan.meals, logs: day.logs, date: today });
  const nextPlanMeal = mealPlan.meals.find((meal) => meal.id === nextId);
  const nextMeal =
    nextPlanMeal === undefined
      ? null
      : { id: nextPlanMeal.id, name: nextPlanMeal.name, timeOfDay: nextPlanMeal.timeOfDay };

  return {
    mealPlanId: mealPlan.id,
    updatedAt: mealPlan.updatedAt,
    mealCount: todayAdherence.mealCount,
    doneToday: todayAdherence.doneCount,
    otherToday: todayAdherence.otherCount,
    nextMeal,
  };
};

type PlanOfDay = { meals: MealOfDay[] };

/** The plan with each meal carrying its log of the day, or null. */
type MealPlanToday<Plan extends PlanOfDay, Log extends LogOfDay> = {
  date: string;
  mealPlan: (Omit<Plan, "meals"> & { meals: (Plan["meals"][number] & { log: Log | null })[] }) | null;
  nextMealId: number | null;
};

/**
 * Today's active plan, as `loadActiveMealPlanDay` reads it, with each meal's log (or null)
 * and the first meal still to log. No active plan shows as `mealPlan: null`.
 */
export const mealPlanTodayFrom = <Plan extends PlanOfDay, Log extends LogOfDay>(
  day: { mealPlan: Plan; logs: Log[] } | null,
  today: string,
): MealPlanToday<Plan, Log> => {
  if (day === null) {
    return { date: today, mealPlan: null, nextMealId: null };
  }

  const logOfMeal = (mealId: number): Log | null =>
    day.logs.find((log) => log.mealId === mealId) ?? null;
  const meals = day.mealPlan.meals.map((meal) => ({ ...meal, log: logOfMeal(meal.id) }));

  return {
    date: today,
    mealPlan: { ...day.mealPlan, meals },
    nextMealId: nextMealId({ meals: day.mealPlan.meals, logs: day.logs, date: today }),
  };
};
