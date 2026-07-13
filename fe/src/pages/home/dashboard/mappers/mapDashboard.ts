import type { Exercise, Workout } from "@api";
import type { DashboardData, RecentWorkout, TodayWorkout } from "../types";

const formatWorkoutDate = (date: Date) =>
  date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });

const sortByNewest = (workouts: Workout[]): Workout[] =>
  [...workouts].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

export const createEmptyDashboardData = (): DashboardData => ({
  userName: "Marco",
  todayWorkout: null,
  stats: [],
  recentWorkouts: [],
});

export const mapTodayWorkout = (
  workout: Workout,
  exercises: Exercise[],
): TodayWorkout => ({
  workoutId: workout.id,
  name: workout.name,
  exercises: exercises.map((exercise) => exercise.name),
  goal:
    exercises.length > 0
      ? `${exercises.length} esercizi`
      : "Nessun esercizio",
  durationMin: 0,
});

export const mapRecentWorkouts = (workouts: Workout[]): RecentWorkout[] =>
  sortByNewest(workouts).map((workout) => ({
    id: workout.id,
    name: workout.name,
    dateLabel: formatWorkoutDate(workout.createdAt),
    durationMin: 0,
    volumeKg: 0,
  }));

export const buildDashboardData = (
  workouts: Workout[],
  todayExercises: Exercise[],
): DashboardData => {
  const sorted = sortByNewest(workouts);

  return {
    userName: "Marco",
    todayWorkout:
      sorted.length > 0 ? mapTodayWorkout(sorted[0], todayExercises) : null,
    stats: [],
    recentWorkouts: mapRecentWorkouts(workouts),
  };
};

export const isDashboardEmpty = (data: DashboardData): boolean =>
  data.recentWorkouts.length === 0 && data.todayWorkout === null;
