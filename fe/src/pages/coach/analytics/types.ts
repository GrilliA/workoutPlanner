import type { StatsRange } from "@api";

export type AnalyticsRangeOption = {
  range: StatsRange;
  label: string;
  periodLabel: string;
};

export type AnalyticsKpi = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "accent";
};

export type WeeklyChartBar = {
  label: string;
  sessionValue: number;
  volumeValue: number;
  showLabel: boolean;
  accessibilityLabel: string;
};

export type WeeklyChartModel = {
  bars: WeeklyChartBar[];
  summary: string;
  volumeSummary: string;
  maxSessionValue: number;
  chartWidth: number;
  barWidth: number;
  barGap: number;
  scrollable: boolean;
  hasVolume: boolean;
};

export type AlertTableRow = {
  athleteId: number;
  athleteLabel: string;
  reason: string;
  extraReasons: number;
  severity: "high" | "medium";
  sessionsLabel: string;
  lastSessionLabel: string;
  href: string;
};

export type AnalyticsViewModel = {
  range: StatsRange;
  periodLabel: string;
  kpis: AnalyticsKpi[];
  weeklyChart: WeeklyChartModel;
  alertRows: AlertTableRow[];
  isEmpty: boolean;
  hasAlerts: boolean;
};
