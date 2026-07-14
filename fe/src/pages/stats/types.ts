export type ProgressStatus = "loading" | "success" | "error" | "empty";

export type ProgressStat = {
  id: string;
  label: string;
  value: string;
  unit: string;
  trend: string;
};

export type ProgressSession = {
  id: number;
  name: string;
  dateLabel: string;
  durationMin: number;
  volumeKg: number;
};

export type DailyChartPoint = {
  date: string;
  weekdayLabel: string;
  volumeKg: number;
  workoutCount: number;
};

export type ProgressData = {
  stats: ProgressStat[];
  dailyBreakdown: DailyChartPoint[];
  recentSessions: ProgressSession[];
  hasSessionHistory: boolean;
};
