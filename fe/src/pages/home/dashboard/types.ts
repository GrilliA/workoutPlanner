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

export type WeekStripDay = {
  dateKey: string;
  weekdayLabel: string;
  dayNumber: number;
  isToday: boolean;
  workoutDayName: string | null;
  isRest: boolean;
  isOverride: boolean;
};

export type DashboardData = {
  todayWorkout: TodayWorkout | null;
  weekDays: WeekStripDay[];
  stats: DashboardStat[];
  recentWorkouts: RecentWorkout[];
  hasSessionHistory: boolean;
};

export type DashboardStatus = "loading" | "success" | "empty" | "error";
