import type { MealLogStatus } from "../db/schema/meallogs";
import { todayInRome } from "./assignmentStatus";
import { addRomeDays } from "./stats";
import { daysBetween } from "./subscription";

// Safety caps, not product rules: a real day has a handful of meals with a few foods each.
// They stop a broken or hostile client from storing plans the panel and the app cannot show.
export const MAX_MEALS_PER_PLAN = 12;
export const MAX_ITEMS_PER_MEAL = 30;
export const MAX_MEAL_NAME_LENGTH = 60;
export const MAX_FOOD_LENGTH = 120;
export const MAX_QUANTITY_LENGTH = 60;
export const MAX_MEAL_PLAN_NOTES_LENGTH = 1000;
export const MAX_MEAL_NOTES_LENGTH = 500;
export const MAX_MEAL_LOG_NOTE_LENGTH = 280;

type OrderedMeal = {
  id: number;
  position: number;
};

type LoggedMeal = {
  mealId: number | null;
  date: string;
};

type DatedLog = {
  date: string;
  status: MealLogStatus;
};

export type MealDayAdherence = {
  date: string;
  mealCount: number;
  doneCount: number;
  otherCount: number;
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
 * Done and other logs per day from `from` to `to` (both included), against the meals the
 * plan has now. A log for a meal removed since then still counts for its day.
 */
export const dailyAdherence = (input: {
  from: string;
  to: string;
  mealCount: number;
  logs: DatedLog[];
}): MealDayAdherence[] => {
  const dayCount = daysBetween(input.from, input.to) + 1;
  const dates = Array.from({ length: Math.max(dayCount, 0) }, (_, offset) =>
    addRomeDays(input.from, offset),
  );

  return dates.map((date) => {
    const logsOfDay = input.logs.filter((log) => log.date === date);
    const doneCount = logsOfDay.filter((log) => log.status === "done").length;
    const otherCount = logsOfDay.filter((log) => log.status === "other").length;

    return { date, mealCount: input.mealCount, doneCount, otherCount };
  });
};
