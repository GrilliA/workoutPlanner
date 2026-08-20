import type { StatsRange } from "../../../api";
import type { ProgressRangeOption } from "../types";

export const PROGRESS_RANGE_OPTIONS: ProgressRangeOption[] = [
  { range: "4w", label: "4 SETT", periodLabel: "ultime 4 settimane" },
  { range: "12w", label: "12 SETT", periodLabel: "ultime 12 settimane" },
  { range: "52w", label: "1 ANNO", periodLabel: "ultimo anno" },
];

export const getRangeOption = (range: StatsRange): ProgressRangeOption =>
  PROGRESS_RANGE_OPTIONS.find((option) => option.range === range) ??
  PROGRESS_RANGE_OPTIONS[0]!;

export const formatPercent = (value: number | null): string => {
  if (value === null) {
    return "—";
  }

  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
};

export const formatSignedPercent = (value: number | null): string => {
  if (value === null) {
    return "Dati insufficienti";
  }

  const rounded = value.toLocaleString("it-IT", { maximumFractionDigits: 1 });
  if (value > 0) {
    return `+${rounded}% vs periodo precedente`;
  }

  if (value < 0) {
    return `${rounded}% vs periodo precedente`;
  }

  return "In linea con il periodo precedente";
};

export const formatDateKeyLabel = (dateKey: string): string => {
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

export const formatInteger = (value: number): string =>
  value.toLocaleString("it-IT", { maximumFractionDigits: 0 });
