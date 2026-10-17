import type { Weekday } from "@api/schemas/workoutday";
import type { DraftWorkoutDay } from "../types";

export const findWeekdayConflict = (
  days: DraftWorkoutDay[],
  dayClientId: string,
  weekday: Weekday,
): DraftWorkoutDay | undefined =>
  days.find(
    (day) => day.clientId !== dayClientId && day.weekdays.includes(weekday),
  );

export const sortWeekdays = (weekdays: Weekday[]): Weekday[] =>
  [...weekdays].sort((a, b) => a - b);

export const reindexWorkoutDays = (days: DraftWorkoutDay[]): DraftWorkoutDay[] =>
  days.map((day, index) => ({
    ...day,
    sortOrder: index,
  }));
