import type { CoachAlert, CoachAnalyticsOverview } from "@api";
import type { AnalyticsKpi, AnalyticsViewModel, AlertTableRow } from "../types";
import { buildPortfolioWeeklyChart } from "./buildWeeklyChart";
import {
  athleteLabel,
  formatDateKeyLabel,
  formatInteger,
  formatPeriodBounds,
  getRangeOption,
} from "./formatters";

const severityRank = { high: 0, medium: 1 } as const;

const mapAlertRows = (overview: CoachAnalyticsOverview): AlertTableRow[] => {
  const clientById = new Map(
    overview.clients.map((client) => [client.athleteId, client] as const),
  );

  const grouped = overview.alerts.reduce<Map<number, CoachAlert[]>>((groups, alert) => {
    const list = groups.get(alert.athleteId) ?? [];
    list.push(alert);
    groups.set(alert.athleteId, list);
    return groups;
  }, new Map());

  return [...grouped.entries()]
    .map(([athleteId, alerts]) => {
      const sorted = [...alerts].sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity],
      );
      const primary = sorted[0]!;
      const client = clientById.get(athleteId);

      return {
        athleteId,
        athleteLabel: athleteLabel(primary.athleteName, athleteId),
        reason: primary.message,
        extraReasons: sorted.length - 1,
        severity: primary.severity,
        sessionsLabel:
          client && client.sessionsCompleted > 0
            ? formatInteger(client.sessionsCompleted)
            : "—",
        lastSessionLabel: formatDateKeyLabel(client?.lastSessionDate ?? null),
        href: `/clients/${athleteId}`,
      };
    })
    .sort((a, b) => {
      const severityDiff = severityRank[a.severity] - severityRank[b.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }

      return a.athleteLabel.localeCompare(b.athleteLabel, "it");
    });
};

const mapKpis = (overview: CoachAnalyticsOverview): AnalyticsKpi[] => {
  const rangeLabel = getRangeOption(overview.range).periodLabel;

  return [
    {
      id: "clients",
      label: "Clienti monitorati",
      value: formatInteger(overview.clientCount),
      hint: overview.clientCount === 1 ? "1 atleta collegato" : "Atleti collegati",
    },
    {
      id: "active",
      label: "Atleti attivi",
      value: formatInteger(overview.athletesActiveInPeriod),
      hint: `Con almeno 1 sessione · ${rangeLabel}`,
    },
    {
      id: "review",
      label: "Clienti da controllare",
      value: formatInteger(overview.clientsToReviewCount),
      hint:
        overview.clientsToReviewCount > 0
          ? "Inattivi o programma in scadenza"
          : "Nessun alert attivo",
      tone: overview.clientsToReviewCount > 0 ? "danger" : "default",
    },
    {
      id: "sessions",
      label: "Sessioni completate",
      value: formatInteger(overview.sessionsCompletedTotal),
      hint: `Totale portafoglio · ${rangeLabel}`,
    },
  ];
};

export const mapCoachAnalytics = (overview: CoachAnalyticsOverview): AnalyticsViewModel => {
  const alertRows = mapAlertRows(overview);

  return {
    range: overview.range,
    periodLabel: formatPeriodBounds(overview.period.from, overview.period.to),
    kpis: mapKpis(overview),
    weeklyChart: buildPortfolioWeeklyChart({
      range: overview.range,
      weeklySeries: overview.weeklySeries,
    }),
    alertRows,
    isEmpty: overview.clientCount === 0,
    hasAlerts: alertRows.length > 0,
  };
};

export const mapDashboardAnalyticsKpis = (
  overview: CoachAnalyticsOverview | null,
): [AnalyticsKpi, AnalyticsKpi] => {
  if (!overview) {
    return [
      {
        id: "active",
        label: "Atleti attivi",
        value: "—",
        hint: "Ultime 4 settimane",
      },
      {
        id: "review",
        label: "Da controllare",
        value: "—",
        hint: "Dati non disponibili",
      },
    ];
  }

  return [
    {
      id: "active",
      label: "Atleti attivi",
      value: formatInteger(overview.athletesActiveInPeriod),
      hint: "Ultime 4 settimane",
    },
    {
      id: "review",
      label: "Da controllare",
      value: formatInteger(overview.clientsToReviewCount),
      hint:
        overview.clientsToReviewCount > 0 ? "Vedi analisi" : "Nessun alert attivo",
      tone: overview.clientsToReviewCount > 0 ? "danger" : "default",
    },
  ];
};
