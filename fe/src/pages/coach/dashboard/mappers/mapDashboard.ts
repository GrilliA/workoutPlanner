import type { CoachAnalyticsOverview, CoachAssignment, CoachClient, CoachDashboard } from "@api";
import { mapDashboardAnalyticsKpis } from "../../analytics/mappers/mapCoachAnalytics";
import type {
  DashboardActivityItem,
  DashboardAthleteRow,
  DashboardExpirationRow,
  DashboardKpi,
  DashboardTask,
  DashboardViewModel,
  RenewalChartModel,
  RenewalWeekBar,
} from "../types";

const EXPIRING_WITHIN_DAYS = 7;

const athleteLabel = (name: string | null, email: string): string =>
  name?.trim() || email;

const todayInRome = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const daysUntilExpiry = (expiresAt: string, today = todayInRome()): number => {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${expiresAt}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
};

const formatDayMonth = (isoDate: string): string => {
  const [, month, day] = isoDate.split("-");
  return `${Number(day)}/${Number(month)}`;
};

const formatRenewalWeekLabel = (weekStart: string, weekEnd: string): string =>
  `${formatDayMonth(weekStart)}–${formatDayMonth(weekEnd)}`;

const renewalCountLabel = (count: number): string =>
  count === 1 ? "1 rinnovo" : `${count} rinnovi`;

const mapRenewalChart = (
  weeks: CoachDashboard["renewalsByWeek"],
): RenewalChartModel => {
  const bars: RenewalWeekBar[] = weeks.map((week) => {
    const label = formatRenewalWeekLabel(week.weekStart, week.weekEnd);
    return {
      label,
      count: week.count,
      accessibilityLabel: `Settimana ${label}, ${renewalCountLabel(week.count)}`,
    };
  });

  const total = bars.reduce((sum, bar) => sum + bar.count, 0);
  const summary =
    total === 0
      ? "Nessun rinnovo nelle prossime 4 settimane."
      : total === 1
        ? "1 scheda scade nelle prossime 4 settimane."
        : `${total} schede scadono nelle prossime 4 settimane.`;

  return { bars, summary };
};

const formatDaysLeft = (daysLeft: number): string => {
  if (daysLeft <= 0) {
    return "Scade oggi";
  }
  if (daysLeft === 1) {
    return "Scade domani";
  }
  return `Tra ${daysLeft} giorni`;
};

const mapUpcoming = (
  items: CoachDashboard["upcomingExpirations"],
): DashboardExpirationRow[] =>
  items.map((item) => ({
    id: item.id,
    athleteId: item.athleteId,
    athleteLabel: athleteLabel(item.athleteName, item.athleteEmail),
    workoutId: item.workoutId,
    workoutName: item.workoutName,
    expiresAt: item.expiresAt,
    timingLabel: formatDaysLeft(item.daysLeft),
    kind: "upcoming" as const,
  }));

const mapExpired = (
  items: CoachDashboard["expiredAssignmentsList"],
): DashboardExpirationRow[] =>
  items.map((item) => ({
    id: item.id,
    athleteId: item.athleteId,
    athleteLabel: athleteLabel(item.athleteName, item.athleteEmail),
    workoutId: item.workoutId,
    workoutName: item.workoutName,
    expiresAt: item.expiresAt,
    timingLabel: `Scaduta il ${item.expiresAt}`,
    kind: "expired" as const,
  }));

const mapKpis = (
  stats: CoachDashboard,
  analytics: CoachAnalyticsOverview | null,
): DashboardKpi[] => {
  const [activeKpi, reviewKpi] = mapDashboardAnalyticsKpis(analytics);
  const expiringThisWeek = stats.renewalsByWeek[0]?.count ?? 0;

  return [
    {
      id: "clients",
      label: "Clienti attivi",
      value: String(stats.clientCount),
      hint:
        stats.activeAssignments > 0
          ? `${stats.activeAssignments} schede live`
          : "Nessuna scheda attiva",
      href: "/clients",
    },
    {
      ...activeKpi,
      href: "/analytics",
    },
    {
      id: "expiring7",
      label: "In scadenza (sett.)",
      value: String(expiringThisWeek),
      hint: "Questa settimana",
      href: "/assignments",
      tone: expiringThisWeek > 0 ? "warning" : "default",
    },
    {
      ...reviewKpi,
      href: "/analytics",
    },
  ];
};

const pickPrimaryAssignment = (
  assignments: CoachAssignment[],
): CoachAssignment | null => {
  const active = assignments.find((item) => item.status === "active");
  if (active) {
    return active;
  }
  const scheduled = assignments.find((item) => item.status === "scheduled");
  if (scheduled) {
    return scheduled;
  }
  const expired = [...assignments]
    .filter((item) => item.status === "expired")
    .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt))[0];
  return expired ?? null;
};

export const mapAthletes = (
  clients: CoachClient[],
  assignments: CoachAssignment[],
  today = todayInRome(),
): DashboardAthleteRow[] => {
  const byAthlete = new Map<number, CoachAssignment[]>();
  for (const assignment of assignments) {
    const list = byAthlete.get(assignment.athleteId) ?? [];
    list.push(assignment);
    byAthlete.set(assignment.athleteId, list);
  }

  return [...clients]
    .sort((a, b) => a.email.localeCompare(b.email))
    .slice(0, 8)
    .map((client) => {
      const primary = pickPrimaryAssignment(byAthlete.get(client.id) ?? []);
      if (!primary) {
        return {
          id: client.id,
          label: athleteLabel(client.name, client.email),
          status: "paused" as const,
          statusLabel: "In pausa",
          metaLabel: "Nessuna scheda assegnata",
        };
      }

      if (primary.status === "expired") {
        return {
          id: client.id,
          label: athleteLabel(client.name, client.email),
          status: "expired" as const,
          statusLabel: "Scaduto",
          metaLabel: `Scaduta il ${primary.expiresAt}`,
        };
      }

      if (primary.status === "scheduled") {
        return {
          id: client.id,
          label: athleteLabel(client.name, client.email),
          status: "paused" as const,
          statusLabel: "Programmata",
          metaLabel: `Parte il ${primary.startsAt}`,
        };
      }

      if (daysUntilExpiry(primary.expiresAt, today) <= EXPIRING_WITHIN_DAYS) {
        return {
          id: client.id,
          label: athleteLabel(client.name, client.email),
          status: "expiring" as const,
          statusLabel: "In scadenza",
          metaLabel: `Scade il ${primary.expiresAt}`,
        };
      }

      return {
        id: client.id,
        label: athleteLabel(client.name, client.email),
        status: "active" as const,
        statusLabel: "Attivo",
        metaLabel: primary.workoutName
          ? primary.workoutName
          : `Scade il ${primary.expiresAt}`,
      };
    });
};

export const mapTasks = (
  upcoming: DashboardExpirationRow[],
  expired: DashboardExpirationRow[],
): DashboardTask[] => {
  const fromExpired = expired.slice(0, 3).map((row) => ({
    id: `expired-${row.id}`,
    title: `Aggiorna ${row.athleteLabel}`,
    detail: `Scheda scaduta: ${row.workoutName}.`,
    href: `/clients/${row.athleteId}/programs/${row.workoutId}`,
    tone: "accent" as const,
  }));

  const fromUpcoming = upcoming.slice(0, 3).map((row) => ({
    id: `upcoming-${row.id}`,
    title: `Rinnova ${row.athleteLabel}`,
    detail: `${row.workoutName} · ${row.timingLabel}.`,
    href: `/clients/${row.athleteId}/programs/${row.workoutId}`,
    tone: "default" as const,
  }));

  return [...fromExpired, ...fromUpcoming].slice(0, 4);
};

const mapRecentActivity = (
  items: CoachDashboard["recentActivity"],
): DashboardActivityItem[] =>
  items.map((item) => ({
    sessionId: item.sessionId,
    athleteId: item.athleteId,
    athleteLabel: athleteLabel(item.athleteName, item.athleteEmail),
    workoutName: item.workoutName,
    completedAtLabel: new Date(item.completedAt).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  }));

export const mapDashboard = (
  stats: CoachDashboard,
  clients: CoachClient[] = [],
  assignments: CoachAssignment[] = [],
  analytics: CoachAnalyticsOverview | null = null,
): DashboardViewModel => {
  const upcoming = mapUpcoming(stats.upcomingExpirations);
  const expired = mapExpired(stats.expiredAssignmentsList);

  return {
    clientCount: stats.clientCount,
    templateCount: stats.templateCount,
    isEmpty: stats.clientCount === 0,
    kpis: mapKpis(stats, analytics),
    renewalChart: mapRenewalChart(stats.renewalsByWeek),
    athletes: mapAthletes(clients, assignments),
    tasks: mapTasks(upcoming, expired),
    recentActivity: mapRecentActivity(stats.recentActivity),
  };
};
