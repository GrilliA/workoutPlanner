import {
  getStats,
  getWorkoutDayExercises,
  getWorkoutScheduleToday,
  getWorkouts,
} from "@api";
import type { DashboardData } from "./types";
import { buildDashboardData } from "./mappers/mapDashboard";

const sortByNewest = <T extends { createdAt: Date }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

export async function fetchDashboardData(): Promise<DashboardData> {
  const [workouts, stats] = await Promise.all([getWorkouts(), getStats()]);

  if (workouts.length === 0) {
    return buildDashboardData([], null, stats);
  }

  const [newestWorkout] = sortByNewest(workouts);
  const schedule = await getWorkoutScheduleToday(newestWorkout.id);

  if (!schedule.workoutDay) {
    return buildDashboardData(workouts, null, stats);
  }

  const exercises = await getWorkoutDayExercises(
    newestWorkout.id,
    schedule.workoutDay.id,
  );

  return buildDashboardData(
    workouts,
    {
      workout: newestWorkout,
      day: schedule.workoutDay,
      exercises,
    },
    stats,
  );
}
