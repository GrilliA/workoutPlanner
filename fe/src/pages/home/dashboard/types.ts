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
  workoutDayId: number | null;
  workoutDayName: string | null;
  isRest: boolean;
  isOverride: boolean;
};

export type ScheduleSource = "override" | "schedule" | "default";

export type ProgramDayOption = {
  id: number;
  name: string;
};

export type TodaySchedule = {
  workoutId: number;
  programName: string;
  dateKey: string;
  source: ScheduleSource | null;
  programDays: ProgramDayOption[];
};

export type DashboardData = {
  todayWorkout: TodayWorkout | null;
  todaySchedule: TodaySchedule | null;
  weekDays: WeekStripDay[];
  stats: DashboardStat[];
  recentWorkouts: RecentWorkout[];
  hasSessionHistory: boolean;
};

export type DashboardStatus = "loading" | "success" | "empty" | "error";
