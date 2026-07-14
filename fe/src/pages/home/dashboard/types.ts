export type TodayWorkout = {
  workoutId: number;
  workoutDayId: number;
  name: string;
  programName: string;
  exercises: string[];
  goal: string;
  durationMin: number;
};

export type DashboardStat = {
  id: string;
  label: string;
  value: string;
  unit: string;
  trend: string;
};

export type RecentWorkout = {
  id: number;
  name: string;
  dateLabel: string;
  durationMin: number;
  volumeKg: number;
};

export type DashboardData = {
  todayWorkout: TodayWorkout | null;
  stats: DashboardStat[];
  recentWorkouts: RecentWorkout[];
  hasSessionHistory: boolean;
};

export type DashboardStatus = "loading" | "success" | "empty" | "error";
