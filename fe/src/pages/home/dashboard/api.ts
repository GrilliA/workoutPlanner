import {
  getStats,
  getWorkoutDayExercises,
  getWorkoutDays,
  getWorkoutScheduleToday,
  getWorkouts,
} from "@api";
import { buildRomeWeekDateKeys } from "@utils/romeCalendar";
import type { DashboardData } from "./types";
import { buildDashboardData, type TodayScheduleInput } from "./mappers/mapDashboard";

const sortByNewest = <T extends { createdAt: Date }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

const fetchWeekSchedule = async (workoutId: number) => {
  const dateKeys = buildRomeWeekDateKeys();

  return Promise.all(
    dateKeys.map((date) => getWorkoutScheduleToday(workoutId, date)),
  );
};

const buildTodayScheduleInput = (
  workoutId: number,
  programName: string,
  schedule: Awaited<ReturnType<typeof getWorkoutScheduleToday>>,
  programDays: Awaited<ReturnType<typeof getWorkoutDays>>,
): TodayScheduleInput => ({
  workoutId,
  programName,
  dateKey: schedule.date,
  source: schedule.source,
  programDays: programDays.map((day) => ({
    id: day.id,
    name: day.name,
  })),
});

export async function fetchDashboardData(): Promise<DashboardData> {
  const [workouts, stats] = await Promise.all([getWorkouts(), getStats()]);

  if (workouts.length === 0) {
    return buildDashboardData(null, stats);
  }

  const [newestWorkout] = sortByNewest(workouts);
  const [schedule, weekSchedules, programDays] = await Promise.all([
    getWorkoutScheduleToday(newestWorkout.id),
    fetchWeekSchedule(newestWorkout.id),
    getWorkoutDays(newestWorkout.id),
  ]);

  const todaySchedule = buildTodayScheduleInput(
    newestWorkout.id,
    newestWorkout.name,
    schedule,
    programDays,
  );

  if (!schedule.workoutDay) {
    return buildDashboardData(null, stats, weekSchedules, todaySchedule);
  }

  const exercises = await getWorkoutDayExercises(
    newestWorkout.id,
    schedule.workoutDay.id,
  );

  return buildDashboardData(
    {
      workout: newestWorkout,
      day: schedule.workoutDay,
      exercises,
    },
    stats,
    weekSchedules,
    todaySchedule,
  );
}
