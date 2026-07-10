import { getExercisesByWorkout, getWorkouts } from "@api";
import type { DashboardData } from "./types";
import {
  buildDashboardData,
  createEmptyDashboardData,
} from "./mappers/mapDashboard";

const sortByNewest = <T extends { createdAt: Date }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

export async function fetchDashboardData(): Promise<DashboardData> {
  const workouts = await getWorkouts();

  if (workouts.length === 0) {
    return createEmptyDashboardData();
  }

  const [newestWorkout] = sortByNewest(workouts);
  const exercises = await getExercisesByWorkout(newestWorkout.id);

  return buildDashboardData(workouts, exercises);
}
