import type { StatsRange, WeeklySeriesPoint } from "@api";
import type { WeeklyChartModel } from "../types";
import { formatInteger, formatKg } from "./formatters";

export type WeeklyChartInput = {
  range: StatsRange;
  weeklySeries: WeeklySeriesPoint[];
};

const formatWeekLabel = (weekStart: string): string => {
  const [, month, day] = weekStart.split("-");
  return `${Number(day)}/${Number(month)}`;
};

export const buildPortfolioWeeklyChart = ({
  weeklySeries,
}: WeeklyChartInput): WeeklyChartModel => {
  const bars = weeklySeries.map((week) => {
    const label = formatWeekLabel(week.weekStart);

    return {
      label,
      sessionValue: week.sessionCount,
      volumeValue: week.volumeKg,
      accessibilityLabel: `Settimana dal ${week.weekStart}: ${formatInteger(week.sessionCount)} sessioni`,
    };
  });

  const totalSessions = bars.reduce((sum, bar) => sum + bar.sessionValue, 0);
  const totalVolume = bars.reduce((sum, bar) => sum + bar.volumeValue, 0);
  const activeWeeks = bars.filter((bar) => bar.sessionValue > 0).length;
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
    hasVolume,
  };
};
