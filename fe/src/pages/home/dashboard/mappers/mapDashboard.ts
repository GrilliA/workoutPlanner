import type { Exercise, UserStats, Workout, WorkoutSchedule } from "@api";
import type {
  DashboardData,
  DashboardStat,
  RecentWorkout,
  TodaySchedule,
  WeekStripDay,
} from "../types";
import { buildRestWeekStrip, mapWeekStrip } from "./mapWeekStrip";

export type TodayWorkoutInput = {
  workout: Workout;
  day: { id: number; name: string };
  exercises: Exercise[];
};

export type TodayScheduleInput = {
  workoutId: number;
  programName: string;
  dateKey: string;
  source: TodaySchedule["source"];
  programDays: TodaySchedule["programDays"];
};

const formatWorkoutDate = (date: Date) =>
  date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });

const formatKgValue = (kg: number): string => {
  if (kg <= 0) {
    return "0";
  }

  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}k`;
  }

  return String(Math.round(kg));
};

export const hasSessionHistory = (stats: UserStats): boolean =>
  stats.recentSessions.length > 0;

export const createEmptyDashboardData = (): DashboardData => ({
  todayWorkout: null,
  todaySchedule: null,
  weekDays: buildRestWeekStrip(),
  stats: [],
  recentWorkouts: [],
  hasSessionHistory: false,
});

export const mapTodaySchedule = (input: TodayScheduleInput): TodaySchedule => ({
  workoutId: input.workoutId,
  programName: input.programName,
  dateKey: input.dateKey,
  source: input.source,
  programDays: input.programDays,
});

export const mapTodayWorkout = (
  workout: Workout,
  day: { id: number; name: string },
  exercises: Exercise[],
): DashboardData["todayWorkout"] => ({
  workoutId: workout.id,
  workoutDayId: day.id,
  name: day.name,
  programName: workout.name,
  exercises: exercises.map((exercise) => exercise.name),
  goal:
    exercises.length > 0
      ? `${exercises.length} esercizi`
      : "Nessun esercizio",
  durationMin: 0,
});

export const mapStats = (stats: UserStats): DashboardStat[] => [
  {
    id: "volume",
    label: "Volume",
    value: formatKgValue(stats.volumeKg),
    unit: "kg",
    trend: stats.volumeKg > 0 ? "Ultimi 7 giorni" : "Nessun dato",
  },
  {
    id: "workout",
    label: "Workout",
    value: String(stats.workoutsPerWeek),
    unit: "/sett",
    trend: stats.workoutsPerWeek > 0 ? "Questa settimana" : "Nessun dato",
  },
  {
    id: "streak",
    label: "Streak",
    value: String(stats.streakDays),
    unit: "giorni",
    trend: stats.streakDays > 0 ? "Giorni consecutivi" : "Nessun dato",
  },
  {
    id: "record",
    label: "Record",
    value: formatKgValue(stats.recordVolumeKg),
    unit: "kg",
    trend: stats.recordVolumeKg > 0 ? "Volume massimo" : "Nessun dato",
  },
];

export const mapRecentSessions = (stats: UserStats): RecentWorkout[] =>
  stats.recentSessions.map((session) => ({
    id: session.sessionId,
    name: session.workoutName,
    dateLabel: formatWorkoutDate(session.completedAt),
    durationMin: session.durationMin,
    volumeKg: session.volumeKg,
  }));

export const buildDashboardData = (
  workouts: Workout[],
  today: TodayWorkoutInput | null,
  stats: UserStats,
  weekSchedules: WorkoutSchedule[] = [],
  todaySchedule: TodayScheduleInput | null = null,
): DashboardData => {
  const sessionHistory = hasSessionHistory(stats);
  const weekDays: WeekStripDay[] =
    weekSchedules.length > 0 ? mapWeekStrip(weekSchedules) : buildRestWeekStrip();

  return {
    todayWorkout: today
      ? mapTodayWorkout(today.workout, today.day, today.exercises)
      : null,
    todaySchedule: todaySchedule ? mapTodaySchedule(todaySchedule) : null,
    weekDays,
    stats: sessionHistory ? mapStats(stats) : [],
    recentWorkouts: mapRecentSessions(stats),
    hasSessionHistory: sessionHistory,
  };
};

export const isDashboardEmpty = (data: DashboardData): boolean =>
  data.recentWorkouts.length === 0 && data.todayWorkout === null;
