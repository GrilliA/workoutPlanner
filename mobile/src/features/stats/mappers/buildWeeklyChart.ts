import type { AthleteAnalytics, StatsRange } from "../../../api";
import type { WeeklyChartModel } from "../types";
import { formatInteger } from "./formatters";

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

const shouldShowBarLabel = (
  index: number,
  barCount: number,
  stride: number,
): boolean => {
  if (barCount <= 1) {
    return true;
  }

  if (index === 0 || index === barCount - 1) {
    return true;
  }

  return index % stride === 0;
};

export const buildWeeklyChartModel = (analytics: AthleteAnalytics): WeeklyChartModel => {
  const stride = labelStrideForRange(analytics.range, analytics.weeklySeries.length);

  const bars = analytics.weeklySeries.map((week, index) => {
    const label = formatWeekLabel(week.weekStart);
    const value = week.sessionCount;

    return {
      label,
      value,
      showLabel: shouldShowBarLabel(index, analytics.weeklySeries.length, stride),
      accessibilityLabel: `Settimana dal ${week.weekStart}: ${formatInteger(value)} sessioni`,
    };
  });

  const totalSessions = bars.reduce((sum, bar) => sum + bar.value, 0);
  const activeWeeks = bars.filter((bar) => bar.value > 0).length;
  const chartWidth = Math.max(240, bars.length * (BAR_WIDTH + BAR_GAP));

  const summary =
    totalSessions === 0
      ? "Nessuna sessione registrata nel periodo selezionato."
      : `${formatInteger(totalSessions)} sessioni in ${formatInteger(activeWeeks)} settimane attive su ${formatInteger(bars.length)}.`;

  return {
    bars,
    summary,
    maxValue: Math.max(1, ...bars.map((bar) => bar.value)),
    chartWidth,
    barWidth: BAR_WIDTH,
    barGap: BAR_GAP,
    scrollable: bars.length > SCROLL_THRESHOLD,
  };
};
