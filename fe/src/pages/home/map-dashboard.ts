import type { Exercise, Workout } from "@api";
import type { DashboardData, RecentWorkout, TodayWorkout } from "./mock-data";

function formatWorkoutDate(date: Date): string {
  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

function sortByNewest(workouts: Workout[]): Workout[] {
  return [...workouts].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export function mapTodayWorkout(
  workout: Workout,
  exercises: Exercise[],
): TodayWorkout {
  return {
    name: workout.name,
    exercises: exercises.map((exercise) => exercise.name),
    goal:
      exercises.length > 0
        ? `${exercises.length} esercizi`
        : "Nessun esercizio",
    durationMin: 0,
  };
}

export function mapRecentWorkouts(workouts: Workout[]): RecentWorkout[] {
  return sortByNewest(workouts).map((workout) => ({
    id: workout.id,
    name: workout.name,
    dateLabel: formatWorkoutDate(workout.createdAt),
    durationMin: 0,
    volumeKg: 0,
  }));
}

export function buildDashboardData(
  workouts: Workout[],
  todayExercises: Exercise[],
): DashboardData {
  const sorted = sortByNewest(workouts);

  return {
    userName: "Marco",
    todayWorkout:
      sorted.length > 0 ? mapTodayWorkout(sorted[0], todayExercises) : null,
    stats: [],
    recentWorkouts: mapRecentWorkouts(workouts),
  };
}
