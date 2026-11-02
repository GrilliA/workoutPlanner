import { getDayNumberFromDateKey } from "../../../utils/romeCalendar";
import type { HomeWeekEntry, WeekStripDay } from "../types";

/** Sentence case come il resto della copy (niente MAIUSCOLO). */
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"] as const;

/** Settimana lun→dom di `GET /athlete/home` → chip della Home. */
export const mapHomeWeek = (
  week: HomeWeekEntry[],
  todayKey: string,
): WeekStripDay[] =>
  week.map((entry) => ({
    dateKey: entry.date,
    weekdayLabel: WEEKDAY_LABELS[entry.weekday],
    dayNumber: getDayNumberFromDateKey(entry.date),
    isToday: entry.date === todayKey,
    workoutDayId: entry.workoutDayId,
    workoutDayName: entry.workoutDayName,
    isRest: entry.workoutDayId === null,
  }));
