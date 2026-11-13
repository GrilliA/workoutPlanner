import type { BusinessRange } from "@api";

/** Strings only: the stories show placeholders in brackets, never invented numbers. */
export type BusinessKpi = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

export type CollectedBar = {
  /** Short month name under the bar: "giu". */
  label: string;
  /** Bar height against the best month, 0..1; 0 draws a flat line. */
  heightRatio: number;
  isCurrentMonth: boolean;
  /** Month and amount for screen readers and the tooltip. */
  accessibilityLabel: string;
};

export type CollectedChartModel = {
  bars: CollectedBar[];
  summary: string;
};

export type RenewalsSummary = {
  /** "3 su 4", or null without due dates. */
  value: string | null;
  hint: string;
};

export type LostMonth = {
  label: string;
  count: string;
};

export type LostSummary = {
  total: string;
  months: LostMonth[];
};

export type BusinessView = {
  isEmpty: boolean;
  kpis: BusinessKpi[];
  chart: CollectedChartModel;
  renewals: RenewalsSummary;
  lost: LostSummary;
};

export type BusinessRangeOption = {
  range: BusinessRange;
  label: string;
};
