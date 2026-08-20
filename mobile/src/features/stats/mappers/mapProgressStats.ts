import type { AthleteAnalytics } from "../../../api";
import { formatKgValue } from "../../home/mappers/mapHomeStats";
import {
  formatInteger,
  formatPeriodBounds,
  formatSignedPercent,
  getRangeOption,
} from "./formatters";
import type { ProgressKpi, ProgressViewModel, VolumeCardModel } from "../types";
import { buildWeeklyChartModel } from "./buildWeeklyChart";
import { mapExerciseProgressions } from "./mapExerciseProgression";

export const hasAnalyticsData = (analytics: AthleteAnalytics): boolean =>
  analytics.sessionsCompleted > 0 ||
  analytics.weeklySeries.some((week) => week.sessionCount > 0);

export const mapProgressInsight = (analytics: AthleteAnalytics): string => {
  const rangeLabel = getRangeOption(analytics.range).periodLabel;

  if (!hasAnalyticsData(analytics)) {
    return `Non ci sono abbastanza sessioni nelle ${rangeLabel} per trarre conclusioni. Continua ad allenarti e torna qui tra qualche giorno.`;
  }

  const parts: string[] = [
    `Hai completato ${formatInteger(analytics.sessionsCompleted)} sessioni nelle ${rangeLabel}.`,
  ];

  if (analytics.volumeChangePct !== null) {
    parts.push(
      formatSignedPercent(analytics.volumeChangePct).replace(
        " vs periodo precedente",
        " nel carico registrato rispetto al periodo precedente",
      ),
    );
  }

  if (analytics.prCount > 0) {
    parts.push(
      analytics.prCount === 1
        ? "Hai registrato 1 nuovo record nel periodo."
        : `Hai registrato ${formatInteger(analytics.prCount)} nuovi record nel periodo.`,
    );
  }

  if (analytics.streakDays > 0) {
    parts.push(
      analytics.streakDays === 1
        ? "La serie attiva è di 1 giorno."
        : `La serie attiva è di ${formatInteger(analytics.streakDays)} giorni.`,
    );
  }

  return parts.join(" ");
};

const mapVolumeCard = (analytics: AthleteAnalytics): VolumeCardModel => {
  const rangeLabel = getRangeOption(analytics.range).periodLabel;

  if (analytics.sessionsCompleted === 0) {
    return {
      title: "CARICO REGISTRATO",
      value: "—",
      unit: "KG",
      trend: `Nessun dato nelle ${rangeLabel}`,
      trendNeutral: true,
    };
  }

  return {
    title: "CARICO REGISTRATO",
    value: formatKgValue(analytics.volumeKg),
    unit: "KG",
    trend: formatSignedPercent(analytics.volumeChangePct),
    trendNeutral: analytics.volumeChangePct === null || analytics.volumeChangePct === 0,
  };
};

const mapKpis = (analytics: AthleteAnalytics): ProgressKpi[] => {
  const rangeLabel = getRangeOption(analytics.range).periodLabel;

  return [
    {
      id: "sessions",
      label: "SESSIONI",
      value:
        analytics.sessionsCompleted > 0
          ? formatInteger(analytics.sessionsCompleted)
          : "—",
      trend: `Completate · ${rangeLabel}`,
    },
    {
      id: "pr",
      label: "PR",
      value: analytics.prCount > 0 ? formatInteger(analytics.prCount) : "—",
      trend:
        analytics.prCount > 0
          ? `Record e1RM · ${rangeLabel}`
          : `Nessun record · ${rangeLabel}`,
    },
    {
      id: "streak",
      label: "SERIE",
      value: analytics.streakDays > 0 ? formatInteger(analytics.streakDays) : "—",
      trend:
        analytics.streakDays > 0
          ? "Giorni consecutivi"
          : `Nessuna serie · ${rangeLabel}`,
    },
  ];
};

export const mapProgressStats = (analytics: AthleteAnalytics): ProgressViewModel => {
  const periodLabel = formatPeriodBounds(analytics.period.from, analytics.period.to);
  const previousPeriodLabel = formatPeriodBounds(
    analytics.previousPeriod.from,
    analytics.previousPeriod.to,
  );

  return {
    range: analytics.range,
    periodLabel,
    previousPeriodLabel,
    insight: mapProgressInsight(analytics),
    kpis: mapKpis(analytics),
    weeklyChart: buildWeeklyChartModel(analytics),
    volumeCard: mapVolumeCard(analytics),
    progressions: mapExerciseProgressions(analytics),
    hasData: hasAnalyticsData(analytics),
  };
};
