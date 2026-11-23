import type { MealLogStatus } from "../db/schema/meallogs";
import { dailyAdherence, nextMealId } from "./mealPlan";

type MealOfDay = {
  id: number;
  name: string;
  timeOfDay: string | null;
  position: number;
};

type LogOfDay = {
  mealId: number | null;
  date: string;
  status: MealLogStatus;
};

/** The plan of the pair with the athlete's logs of one day, as `loadMealPlanDay` reads it. */
type MealPlanDay<Meal extends MealOfDay, Log extends LogOfDay> = {
  mealPlan: { id: number; isActive: boolean; updatedAt: Date; meals: Meal[] };
  logs: Log[];
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
 * `null` hides the switch: no plan of the linked coach (no coach means no plan), a plan turned
 * off, or a plan with no meals. Today's counts walk the plan's meals like the coach's adherence,
 * so they never count a removed meal.
 */
export const athleteNutritionFrom = <Meal extends MealOfDay, Log extends LogOfDay>(
  day: MealPlanDay<Meal, Log> | null,
  today: string,
): AthleteNutrition | null => {
  if (day === null) {
    return null;
  }

  const { mealPlan } = day;
  const hasMealsToFollow = mealPlan.isActive && mealPlan.meals.length > 0;

  if (!hasMealsToFollow) {
    return null;
  }

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

/** Today's plan for the athlete: each meal carries its log of the day, or null. */
type MealPlanToday<Plan extends { meals: MealOfDay[] }, Log extends LogOfDay> = {
  date: string;
  mealPlan: (Omit<Plan, "meals"> & { meals: (Plan["meals"][number] & { log: Log | null })[] }) | null;
  nextMealId: number | null;
};

/**
 * Today's plan with each meal's log (or null), and the first meal still to log. An inactive
 * plan shows as no plan: the athlete cannot log against it.
 */
export const mealPlanTodayFrom = <
  Plan extends { isActive: boolean; meals: MealOfDay[] },
  Log extends LogOfDay,
>(
  day: { mealPlan: Plan; logs: Log[] } | null,
  today: string,
): MealPlanToday<Plan, Log> => {
  if (day === null || !day.mealPlan.isActive) {
    return { date: today, mealPlan: null, nextMealId: null };
  }

  const logOfMeal = (mealId: number): Log | null =>
    day.logs.find((log) => log.mealId === mealId && log.date === today) ?? null;
  const meals = day.mealPlan.meals.map((meal) => ({ ...meal, log: logOfMeal(meal.id) }));
  const mealPlan = { ...day.mealPlan, meals };

  return {
    date: today,
    mealPlan,
    nextMealId: nextMealId({ meals: day.mealPlan.meals, logs: day.logs, date: today }),
  };
};
