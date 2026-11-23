import type { MealDayAdherence } from "@api";
import { WEEKDAY_LABELS_SHORT, addRomeDays, getRomeWeekday } from "@utils/romeCalendar";

const ADHERENCE_DAYS = 7;

type AdherenceDay = {
  date: string;
  weekdayLabel: string;
  isToday: boolean;
  /** Share of the plan's meals marked done, 0..100: the height of the bar. */
  donePercent: number;
  /** What the bar says, for screen readers. */
  description: string;
};

export type AdherenceView = {
  /** Done meals over planned meals in the period; null when there is nothing to count. */
  percent: number | null;
  days: AdherenceDay[];
  removedCount: number;
};

/** The range of `GET …/meal-logs` for the last seven days, today included (contract). */
export function adherenceRange(today: string): { from: string; to: string } {
  return { from: addRomeDays(today, -(ADHERENCE_DAYS - 1)), to: today };
}

const percentOf = (part: number, total: number): number => Math.round((part / total) * 100);

// Midday UTC is the same calendar day in Rome, whatever the season.
const weekdayLabelOf = (date: string): string =>
  WEEKDAY_LABELS_SHORT[getRomeWeekday(new Date(`${date}T12:00:00Z`))];

const describeDay = (day: MealDayAdherence, weekdayLabel: string, isToday: boolean): string => {
  const dayName = isToday ? `${weekdayLabel}, oggi` : weekdayLabel;
  return `${dayName}: fatti ${day.doneCount}, altro ${day.otherCount}, pasti nel piano ${day.mealCount}`;
};

export function adherenceView(days: MealDayAdherence[], today: string): AdherenceView {
  const plannedCount = days.reduce((total, day) => total + day.mealCount, 0);
  const doneCount = days.reduce((total, day) => total + day.doneCount, 0);
  const removedCount = days.reduce((total, day) => total + day.removedCount, 0);

  return {
    percent: plannedCount === 0 ? null : percentOf(doneCount, plannedCount),
    removedCount,
    days: days.map((day) => {
      const weekdayLabel = weekdayLabelOf(day.date);
      const isToday = day.date === today;

      return {
        date: day.date,
        weekdayLabel,
        isToday,
        donePercent: day.mealCount === 0 ? 0 : percentOf(day.doneCount, day.mealCount),
        description: describeDay(day, weekdayLabel, isToday),
      };
    }),
  };
}
