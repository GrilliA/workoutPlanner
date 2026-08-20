import type { StatsRange } from "@api";
import type { AnalyticsRangeOption } from "../types";

export const ANALYTICS_RANGE_OPTIONS: AnalyticsRangeOption[] = [
  { range: "4w", label: "4 SETT", periodLabel: "ultime 4 settimane" },
  { range: "12w", label: "12 SETT", periodLabel: "ultime 12 settimane" },
  { range: "52w", label: "1 ANNO", periodLabel: "ultimo anno" },
];

export const getRangeOption = (range: StatsRange): AnalyticsRangeOption =>
  ANALYTICS_RANGE_OPTIONS.find((option) => option.range === range) ??
  ANALYTICS_RANGE_OPTIONS[0]!;

export const formatPercent = (value: number | null): string => {
  if (value === null) {
    return "—";
  }

  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
};

export const formatInteger = (value: number): string =>
  value.toLocaleString("it-IT", { maximumFractionDigits: 0 });

export const formatDateKeyLabel = (dateKey: string | null): string => {
  if (!dateKey) {
    return "Mai";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const formatPeriodBounds = (from: string, to: string): string =>
  `${formatDateKeyLabel(from)} – ${formatDateKeyLabel(to)}`;

export const formatKg = (value: number): string =>
  value >= 1000
    ? `${(value / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} t`
    : `${formatInteger(Math.round(value))} kg`;

export const athleteLabel = (name: string | null, athleteId: number): string =>
  name?.trim() || `Cliente #${athleteId}`;
