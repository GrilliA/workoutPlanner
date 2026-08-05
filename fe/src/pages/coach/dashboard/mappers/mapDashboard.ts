import type { CoachAssignment, CoachClient, CoachDashboard } from "@api";
import type {
  DashboardAthleteRow,
  DashboardExpirationRow,
  DashboardKpi,
  DashboardMonthPoint,
  DashboardTask,
  DashboardViewModel,
} from "../types";

const MONTH_LABELS_IT = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
] as const;

const athleteLabel = (name: string | null, email: string): string =>
  name?.trim() || email;

const formatDaysLeft = (daysLeft: number): string => {
  if (daysLeft <= 0) {
    return "Scade oggi";
  }
  if (daysLeft === 1) {
    return "Scade domani";
  }
  return `Tra ${daysLeft} giorni`;
};

const formatMonthLabel = (month: string): string => {
  const [, monthPart] = month.split("-");
  const index = Number(monthPart) - 1;
  if (!Number.isInteger(index) || index < 0 || index > 11) {
    return month;
  }
  return MONTH_LABELS_IT[index];
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

const mapMonthPoints = (
  points: CoachDashboard["expirationsByMonth"],
): DashboardMonthPoint[] =>
  points.map((point) => ({
    month: point.month,
    monthLabel: formatMonthLabel(point.month),
    count: point.count,
  }));

const mapKpis = (stats: CoachDashboard): DashboardKpi[] => {
  const denom = stats.clientCount || 1;
  const activeShare = Math.round((stats.activeAssignments / denom) * 100);

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
      id: "completion",
      label: "Copertura schede",
      value: `${Math.min(activeShare, 100)}%`,
      hint:
        stats.activeAssignments > 0
          ? "Assegnazioni attive / clienti"
          : "Nessun dato",
      href: "/assignments",
      tone: activeShare >= 70 ? "accent" : "default",
    },
    {
      id: "expiring7",
      label: "In scadenza (sett.)",
      value: String(stats.expiringIn7Days),
      hint: "Entro 7 giorni",
      href: "/assignments",
      tone: stats.expiringIn7Days > 0 ? "warning" : "default",
    },
    {
      id: "requests",
      label: "Da rinnovare",
      value: String(stats.expiredAssignments),
      hint: stats.expiredAssignments > 0 ? "Vedi tutte" : "Tutto ok",
      href: "/assignments",
      tone: stats.expiredAssignments > 0 ? "danger" : "default",
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
          status: "expiring" as const,
          statusLabel: "In scadenza",
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

export const mapDashboard = (
  stats: CoachDashboard,
  clients: CoachClient[] = [],
  assignments: CoachAssignment[] = [],
): DashboardViewModel => {
  const upcoming = mapUpcoming(stats.upcomingExpirations);
  const expired = mapExpired(stats.expiredAssignmentsList);

  return {
    clientCount: stats.clientCount,
    templateCount: stats.templateCount,
    isEmpty: stats.clientCount === 0,
    kpis: mapKpis(stats),
    athletes: mapAthletes(clients, assignments),
    tasks: mapTasks(upcoming, expired),
    upcoming,
    expired,
    monthPoints: mapMonthPoints(stats.expirationsByMonth),
  };
};
