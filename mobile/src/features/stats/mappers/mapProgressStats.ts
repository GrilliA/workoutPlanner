import type { AthleteAnalytics } from "../../../api";
import { formatKgValue } from "../../home/mappers/mapHomeStats";
import {
  formatInteger,
  formatPeriodBounds,
  formatSignedPercent,
  getRangeOption,
} from "./formatters";
import type { ProgressHero, ProgressTile, ProgressViewModel } from "../types";
import { buildWeeklyChartModel } from "./buildWeeklyChart";
import { mapExerciseProgressions } from "./mapExerciseProgression";

export const hasAnalyticsData = (analytics: AthleteAnalytics): boolean =>
  analytics.sessionsCompleted > 0 ||
  analytics.weeklySeries.some((week) => week.sessionCount > 0);

const mapVolumeLine = (analytics: AthleteAnalytics): string | null => {
  if (analytics.sessionsCompleted === 0) {
    return null;
  }
  const volume = `${formatKgValue(analytics.volumeKg)} kg sollevati`;
  if (analytics.volumeChangePct === null) {
    return volume;
  }
  return `${volume} · ${formatSignedPercent(analytics.volumeChangePct)}`;
};

export const mapProgressHero = (analytics: AthleteAnalytics): ProgressHero => {
  const rangeLabel = getRangeOption(analytics.range).periodLabel;
  const noun = analytics.sessionsCompleted === 1 ? "allenamento" : "allenamenti";
  return {
    value: formatInteger(analytics.sessionsCompleted),
    label: `${noun} nelle ${rangeLabel}`,
    volumeLine: mapVolumeLine(analytics),
  };
};

const mapRecordTile = (analytics: AthleteAnalytics): ProgressTile => {
  if (analytics.prCount === 0) {
    return { id: "pr", label: "Record", value: "0", note: "Nessuno nel periodo" };
  }
  const note = analytics.prCount === 1 ? "Nuovo massimale" : "Nuovi massimali";
  return { id: "pr", label: "Record", value: formatInteger(analytics.prCount), note };
};

const mapStreakTile = (analytics: AthleteAnalytics): ProgressTile => {
  const note = analytics.streakDays === 1 ? "Giorno di fila" : "Giorni di fila";
  return {
    id: "streak",
    label: "Serie",
    value: formatInteger(analytics.streakDays),
    note,
  };
};

export const mapProgressStats = (analytics: AthleteAnalytics): ProgressViewModel => ({
  range: analytics.range,
  periodLabel: formatPeriodBounds(analytics.period.from, analytics.period.to),
  hero: mapProgressHero(analytics),
  tiles: [mapRecordTile(analytics), mapStreakTile(analytics)],
  weeklyChart: buildWeeklyChartModel(analytics),
  progressions: mapExerciseProgressions(analytics),
  hasData: hasAnalyticsData(analytics),
});
