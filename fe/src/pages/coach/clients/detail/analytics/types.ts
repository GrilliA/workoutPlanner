import type { StatsRange } from "@api";

export type ClientAnalyticsKpi = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

export type ClientExerciseRow = {
  exerciseId: number;
  name: string;
  prLabel: string;
  trendLabel: string;
};

export type ClientAnalyticsViewModel = {
  range: StatsRange;
  periodLabel: string;
  insight: string;
  kpis: ClientAnalyticsKpi[];
  weeklyChart: import("../../../analytics/types").WeeklyChartModel;
  exercises: ClientExerciseRow[];
  hasData: boolean;
};

export type ClientAnalyticsStatus =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ClientAnalyticsViewModel };
