import type { StatsRange } from "../../api";

export type ProgressRangeOption = {
  range: StatsRange;
  label: string;
  periodLabel: string;
};

/** Tile bianca sotto la card indaco: record e serie. */
export type ProgressTile = {
  id: "pr" | "streak";
  label: string;
  value: string;
  note: string;
};

/** Numero grande della card indaco: allenamenti nel periodo + carico. */
export type ProgressHero = {
  value: string;
  label: string;
  /** "12.4k kg sollevati · +20% vs periodo precedente"; null senza sessioni. */
  volumeLine: string | null;
};

export type ProgressViewModel = {
  range: StatsRange;
  periodLabel: string;
  hero: ProgressHero;
  tiles: ProgressTile[];
  weeklyChart: WeeklyChartModel;
  progressions: ProgressionOption[];
  hasData: boolean;
};

export type WeeklyChartBar = {
  label: string;
  value: number;
  accessibilityLabel: string;
  showLabel: boolean;
  /** Settimana in corso: barra arancio. */
  isCurrent: boolean;
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
