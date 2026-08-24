import type { AthleteAnalytics, CoachAthleteAnalytics } from "@api";
import { buildPortfolioWeeklyChart } from "../../../../analytics/mappers/buildWeeklyChart";
import {
  formatDateKeyLabel,
  formatInteger,
  formatKg,
  formatPeriodBounds,
  getRangeOption,
} from "../../../../analytics/mappers/formatters";
import type { ClientAnalyticsViewModel, ClientExerciseRow } from "../types";

const hasAnalyticsData = (analytics: AthleteAnalytics): boolean =>
  analytics.sessionsCompleted > 0 ||
  analytics.weeklySeries.some((week) => week.sessionCount > 0);

const mapInsight = (analytics: AthleteAnalytics): string => {
  const rangeLabel = getRangeOption(analytics.range).periodLabel;

  if (!hasAnalyticsData(analytics)) {
    return `Non ci sono abbastanza sessioni nelle ${rangeLabel} per trarre conclusioni.`;
  }

  const parts: string[] = [
    `${formatInteger(analytics.sessionsCompleted)} sessioni completate nel periodo.`,
  ];

  if (analytics.prCount > 0) {
    parts.push(
      analytics.prCount === 1
        ? "1 nuovo record e1RM registrato."
        : `${formatInteger(analytics.prCount)} nuovi record e1RM registrati.`,
    );
  }

  return parts.join(" ");
};

const mapKpis = (analytics: AthleteAnalytics): ClientAnalyticsViewModel["kpis"] => {
  const rangeLabel = getRangeOption(analytics.range).periodLabel;
  const lastSession = analytics.recentSessions[0]?.completedAt ?? null;
  const lastSessionKey =
    typeof lastSession === "string" ? lastSession.slice(0, 10) : null;

  return [
    {
      id: "sessions",
      label: "Sessioni",
      value:
        analytics.sessionsCompleted > 0 ? formatInteger(analytics.sessionsCompleted) : "—",
      hint: `Completate · ${rangeLabel}`,
    },
    {
      id: "pr",
      label: "PR",
      value: analytics.prCount > 0 ? formatInteger(analytics.prCount) : "—",
      hint: analytics.prCount > 0 ? "Record e1RM" : "Nessun record",
    },
    {
      id: "volume",
      label: "Carico",
      value: analytics.volumeKg > 0 ? formatKg(analytics.volumeKg) : "—",
      hint: analytics.volumeKg > 0 ? "Registrato nel periodo" : "Non disponibile",
    },
    {
      id: "last-session",
      label: "Ultima sessione",
      value: lastSessionKey ? formatDateKeyLabel(lastSessionKey) : "—",
      hint: lastSessionKey ? "Data ultima completata" : "Nessuna sessione",
    },
  ];
};

const mapExercises = (analytics: AthleteAnalytics): ClientExerciseRow[] =>
  analytics.exerciseProgressions
    .filter((item) => item.points.length > 0)
    .slice(0, 6)
    .map((item) => {
      const latest = item.points[item.points.length - 1]!;
      const prLabel =
        item.prE1RM !== null
          ? `e1RM ${formatInteger(Math.round(item.prE1RM))} kg`
          : item.prWeightKg !== null
            ? `${formatInteger(Math.round(item.prWeightKg))} kg`
            : "—";

      return {
        exerciseId: item.exerciseId,
        name: item.exerciseName,
        prLabel,
        trendLabel: `Ultima sessione ${formatDateKeyLabel(latest.date)}`,
      };
    });

export const mapClientAnalytics = (
  detail: CoachAthleteAnalytics,
): ClientAnalyticsViewModel => {
  const analytics = detail.analytics;

  return {
    range: analytics.range,
    periodLabel: formatPeriodBounds(analytics.period.from, analytics.period.to),
    insight: mapInsight(analytics),
    kpis: mapKpis(analytics),
    weeklyChart: buildPortfolioWeeklyChart({
      range: analytics.range,
      weeklySeries: analytics.weeklySeries,
    }),
    exercises: mapExercises(analytics),
    hasData: hasAnalyticsData(analytics),
  };
};
