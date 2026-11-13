import type { MealLogStatus } from "../db/schema/meallogs";
import { todayInRome } from "./assignmentStatus";
import { addRomeDays } from "./stats";
import { daysBetween } from "./subscription";

type OrderedMeal = {
  id: number;
  position: number;
};

type LoggedMeal = {
  mealId: number | null;
  date: string;
};

type DatedLog = {
  mealId: number | null;
  date: string;
  status: MealLogStatus;
};

export type MealDayAdherence = {
  date: string;
  mealCount: number;
  doneCount: number;
  otherCount: number;
  removedCount: number;
};

const byPositionThenId = (first: OrderedMeal, second: OrderedMeal): number =>
  first.position - second.position || first.id - second.id;

/** The first meal in plan order with no log for `date`, or null when every meal is logged. */
export const nextMealId = (input: {
  meals: OrderedMeal[];
  logs: LoggedMeal[];
  date: string;
}): number | null => {
  const loggedMealIds = input.logs
    .filter((log) => log.date === input.date)
    .map((log) => log.mealId);
  const mealsInOrder = [...input.meals].sort(byPositionThenId);
  const firstUnlogged = mealsInOrder.find((meal) => !loggedMealIds.includes(meal.id));

  return firstUnlogged === undefined ? null : firstUnlogged.id;
};

/**
 * An athlete can log today or yesterday, as Rome days. Yesterday covers the late dinner
 * logged after midnight; older days would let the history be rewritten.
 */
export const isLoggableDate = (dateKey: string, now = new Date()): boolean => {
  const today = todayInRome(now);
  const yesterday = addRomeDays(today, -1);

  return dateKey === today || dateKey === yesterday;
};

/**
 * Done and other meals per day from `from` to `to` (both included), against the meals the
 * plan has now. Counting walks the plan's meals, not the logs, so done + other never goes
 * past `mealCount`. A log for a meal removed since then (`mealId` null or not in `mealIds`)
 * goes in `removedCount`: it stays visible without inflating the day.
 */
export const dailyAdherence = (input: {
  from: string;
  to: string;
  mealIds: number[];
  logs: DatedLog[];
}): MealDayAdherence[] => {
  const dayCount = daysBetween(input.from, input.to) + 1;
  const dates = Array.from({ length: Math.max(dayCount, 0) }, (_, offset) =>
    addRomeDays(input.from, offset),
  );
  const mealCount = input.mealIds.length;

  return dates.map((date) => {
    const logsOfDay = input.logs.filter((log) => log.date === date);
    // One status per meal (the first log found): the unique key allows one log per meal
    // and day, and even a duplicate in the input cannot count a meal twice.
    const statusOfMeal = (mealId: number): MealLogStatus | undefined =>
      logsOfDay.find((log) => log.mealId === mealId)?.status;
    const doneCount = input.mealIds.filter((mealId) => statusOfMeal(mealId) === "done").length;
    const otherCount = input.mealIds.filter((mealId) => statusOfMeal(mealId) === "other").length;
    const removedCount = logsOfDay.filter(
      (log) => log.mealId === null || !input.mealIds.includes(log.mealId),
    ).length;

    return { date, mealCount, doneCount, otherCount, removedCount };
  });
};
