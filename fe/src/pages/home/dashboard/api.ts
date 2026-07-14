import { getExercisesByWorkout, getStats, getWorkouts } from "@api";
import type { DashboardData } from "./types";
import { buildDashboardData } from "./mappers/mapDashboard";

const sortByNewest = <T extends { createdAt: Date }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

export async function fetchDashboardData(): Promise<DashboardData> {
  const [workouts, stats] = await Promise.all([getWorkouts(), getStats()]);

  if (workouts.length === 0) {
    return buildDashboardData([], [], stats);
  }

  const [newestWorkout] = sortByNewest(workouts);
  const exercises = await getExercisesByWorkout(newestWorkout.id);

  return buildDashboardData(workouts, exercises, stats);
}
