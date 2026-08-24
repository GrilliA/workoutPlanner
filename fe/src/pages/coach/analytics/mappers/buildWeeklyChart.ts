import type { StatsRange, WeeklySeriesPoint } from "@api";
import type { WeeklyChartModel } from "../types";
import { formatInteger, formatKg } from "./formatters";

export type WeeklyChartInput = {
  range: StatsRange;
  weeklySeries: WeeklySeriesPoint[];
};

const BAR_WIDTH = 28;
const BAR_GAP = 6;
const SCROLL_THRESHOLD = 8;

const formatWeekLabel = (weekStart: string): string => {
  const [, month, day] = weekStart.split("-");
  return `${Number(day)}/${Number(month)}`;
};

const labelStrideForRange = (range: StatsRange, barCount: number): number => {
  if (range === "52w") {
    return 4;
  }

  if (range === "12w") {
    return barCount > 8 ? 2 : 1;
  }

  return 1;
};

const shouldShowBarLabel = (index: number, barCount: number, stride: number): boolean => {
  if (barCount <= 1) {
    return true;
  }

  if (index === 0 || index === barCount - 1) {
    return true;
  }

  return index % stride === 0;
};

export const buildPortfolioWeeklyChart = (input: WeeklyChartInput): WeeklyChartModel => {
  const stride = labelStrideForRange(input.range, input.weeklySeries.length);

  const bars = input.weeklySeries.map((week, index) => {
    const label = formatWeekLabel(week.weekStart);

    return {
      label,
      sessionValue: week.sessionCount,
      volumeValue: week.volumeKg,
      showLabel: shouldShowBarLabel(index, input.weeklySeries.length, stride),
      accessibilityLabel: `Settimana dal ${week.weekStart}: ${formatInteger(week.sessionCount)} sessioni`,
    };
  });

  const totalSessions = bars.reduce((sum, bar) => sum + bar.sessionValue, 0);
  const totalVolume = bars.reduce((sum, bar) => sum + bar.volumeValue, 0);
  const activeWeeks = bars.filter((bar) => bar.sessionValue > 0).length;
  const chartWidth = Math.max(240, bars.length * (BAR_WIDTH + BAR_GAP));
  const hasVolume = totalVolume > 0;

  const summary =
    totalSessions === 0
      ? "Nessuna sessione registrata nel periodo selezionato."
      : `${formatInteger(totalSessions)} sessioni in ${formatInteger(activeWeeks)} settimane attive su ${formatInteger(bars.length)}.`;

  const volumeSummary = hasVolume
    ? `Carico registrato nel periodo: ${formatKg(totalVolume)}.`
    : "Carico registrato non disponibile nel periodo.";

  return {
    bars,
    summary,
    volumeSummary,
    maxSessionValue: Math.max(1, ...bars.map((bar) => bar.sessionValue)),
    chartWidth,
    barWidth: BAR_WIDTH,
    barGap: BAR_GAP,
    scrollable: bars.length > SCROLL_THRESHOLD,
    hasVolume,
  };
};
