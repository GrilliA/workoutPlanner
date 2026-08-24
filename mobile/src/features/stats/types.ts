import type { StatsRange } from "../../api";

export type ProgressRangeOption = {
  range: StatsRange;
  label: string;
  periodLabel: string;
};

export type ProgressKpi = {
  id: "sessions" | "pr" | "streak";
  label: string;
  value: string;
  unit?: string;
  trend: string;
};

export type ProgressViewModel = {
  range: StatsRange;
  periodLabel: string;
  previousPeriodLabel: string;
  insight: string;
  kpis: ProgressKpi[];
  weeklyChart: WeeklyChartModel;
  volumeCard: VolumeCardModel;
  progressions: ProgressionOption[];
  hasData: boolean;
};

export type WeeklyChartBar = {
  label: string;
  value: number;
  accessibilityLabel: string;
  showLabel: boolean;
};

export type WeeklyChartModel = {
  bars: WeeklyChartBar[];
  summary: string;
  maxValue: number;
  chartWidth: number;
  barWidth: number;
  barGap: number;
  scrollable: boolean;
};

export type VolumeCardModel = {
  title: string;
  value: string;
  unit: string;
  trend: string;
  trendNeutral: boolean;
};

export type ProgressionOption = {
  exerciseId: number;
  label: string;
  prLabel: string;
  charts: Record<ProgressionMetric, ProgressionChartModel>;
};

export type ProgressionMetric = "e1rm" | "weight";

export type ProgressionChartModel = {
  metric: ProgressionMetric;
  points: Array<{ x: number; y: number; label: string }>;
  summary: string;
  hasValues: boolean;
};

export type HistorySessionRow = {
  id: number;
  title: string;
  meta: string;
  volumeLabel: string;
};

export type HistoryViewModel = {
  rows: HistorySessionRow[];
  page: number;
  totalPages: number;
  total: number;
  canLoadMore: boolean;
  emptyMessage: string;
};
