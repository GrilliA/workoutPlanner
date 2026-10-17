import type { AthleteHome, Workout } from "../../../api";
import { dateFromRomeDateKey } from "../../../utils/romeCalendar";
import type {
  ActiveProgramModel,
  MyWorkoutRow,
  MyWorkoutStatus,
  WorkoutsModel,
} from "../types";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"] as const;

type HomeProgram = AthleteHome["programs"][number];

/** "15 ottobre" da una data YYYY-MM-DD di Roma. */
export const formatDayMonth = (dateKey: string): string =>
  dateFromRomeDateKey(dateKey).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

const formatWeekdays = (weekdays: number[]): string =>
  weekdays.map((weekday) => WEEKDAY_LABELS[weekday]).join(", ");

const formatExerciseCount = (count: number): string => {
  if (count === 1) {
    return "1 esercizio";
  }
  return `${count} esercizi`;
};

export const mapActiveProgram = (program: HomeProgram): ActiveProgramModel => {
  const isFromCoach = program.source === "coach";
  const validityLabel =
    isFromCoach && program.expiresAt
      ? `Valida fino al ${formatDayMonth(program.expiresAt)}`
      : null;
  return {
    workoutId: program.workoutId,
    name: program.name,
    sourceLabel: isFromCoach ? "dal coach" : "tua",
    isFromCoach,
    validityLabel,
    days: program.days.map((day) => ({
      id: day.id,
      name: day.name,
      weekdaysLabel: formatWeekdays(day.weekdays),
    })),
  };
};

const isOwnWorkout = (workout: Workout, userId: number): boolean =>
  workout.createdByUserId == null || workout.createdByUserId === userId;

const workoutStatus = (workout: Workout, hasCoachProgram: boolean): MyWorkoutStatus => {
  if (!workout.isActive) {
    return "inactive";
  }
  if (hasCoachProgram) {
    return "paused";
  }
  return "active";
};

/**
 * La scheda "In uso" è la prima della Home (coach se assegnata, altrimenti
 * la più recente tua attiva); "Le mie schede" sono le tue, senza ripeterla.
 */
export const mapWorkouts = (
  home: AthleteHome,
  workouts: Workout[],
  userId: number,
): WorkoutsModel => {
  const inUse = home.programs[0] ?? null;
  const hasCoachProgram = inUse?.source === "coach";
  const myWorkouts: MyWorkoutRow[] = workouts
    .filter((workout) => isOwnWorkout(workout, userId))
    .filter((workout) => workout.id !== inUse?.workoutId)
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
    .map((workout) => ({
      workoutId: workout.id,
      name: workout.name,
      meta: formatExerciseCount(workout.exerciseCount),
      status: workoutStatus(workout, hasCoachProgram),
    }));

  return {
    activeProgram: inUse ? mapActiveProgram(inUse) : null,
    myWorkouts,
  };
};
