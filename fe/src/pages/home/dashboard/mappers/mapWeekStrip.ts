import type { WorkoutSchedule } from "@api";
import {
  WEEKDAY_LABELS_SHORT,
  buildRomeWeekDateKeys,
  getDayNumberFromDateKey,
  toRomeDateKey,
} from "@utils/romeCalendar";
import type { WeekStripDay } from "../types";

export const mapWeekStrip = (
  schedules: WorkoutSchedule[],
  reference = new Date(),
): WeekStripDay[] => {
  const todayKey = toRomeDateKey(reference);

  return schedules.map((schedule) => ({
    dateKey: schedule.date,
    weekdayLabel: WEEKDAY_LABELS_SHORT[schedule.weekday],
    dayNumber: getDayNumberFromDateKey(schedule.date),
    isToday: schedule.date === todayKey,
    workoutDayId: schedule.workoutDay?.id ?? null,
    workoutDayName: schedule.workoutDay?.name ?? null,
    isRest: schedule.workoutDay === null,
    isOverride: schedule.source === "override",
  }));
};

export const buildRestWeekStrip = (reference = new Date()): WeekStripDay[] => {
  const todayKey = toRomeDateKey(reference);

  return buildRomeWeekDateKeys(reference).map((dateKey, weekday) => ({
    dateKey,
    weekdayLabel: WEEKDAY_LABELS_SHORT[weekday],
    dayNumber: getDayNumberFromDateKey(dateKey),
    isToday: dateKey === todayKey,
    workoutDayId: null,
    workoutDayName: null,
    isRest: true,
    isOverride: false,
  }));
};
