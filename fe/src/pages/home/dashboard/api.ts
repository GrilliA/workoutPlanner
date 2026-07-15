import {
  getStats,
  getWorkoutDayExercises,
  getWorkoutScheduleToday,
  getWorkouts,
} from "@api";
import { buildRomeWeekDateKeys } from "@utils/romeCalendar";
import type { DashboardData } from "./types";
import { buildDashboardData } from "./mappers/mapDashboard";

const sortByNewest = <T extends { createdAt: Date }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

const fetchWeekSchedule = async (workoutId: number) => {
  const dateKeys = buildRomeWeekDateKeys();

  return Promise.all(
    dateKeys.map((date) => getWorkoutScheduleToday(workoutId, date)),
  );
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const [workouts, stats] = await Promise.all([getWorkouts(), getStats()]);

  if (workouts.length === 0) {
    return buildDashboardData([], null, stats);
  }

  const [newestWorkout] = sortByNewest(workouts);
  const [schedule, weekSchedules] = await Promise.all([
    getWorkoutScheduleToday(newestWorkout.id),
    fetchWeekSchedule(newestWorkout.id),
  ]);

  if (!schedule.workoutDay) {
    return buildDashboardData(workouts, null, stats, weekSchedules);
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
    weekSchedules,
  );
}
