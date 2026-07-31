import type { CoachDashboard } from "@api";
import type {
  DashboardExpirationRow,
  DashboardKpi,
  DashboardMonthPoint,
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

const mapKpis = (stats: CoachDashboard): DashboardKpi[] => [
  {
    id: "clients",
    label: "Clienti",
    value: stats.clientCount,
    href: "/clients",
  },
  {
    id: "active",
    label: "Schede attive",
    value: stats.activeAssignments,
    href: "/assignments",
  },
  {
    id: "expiring7",
    label: "In scadenza ≤7gg",
    value: stats.expiringIn7Days,
    href: "/assignments",
    tone: stats.expiringIn7Days > 0 ? "warning" : "default",
  },
  {
    id: "expired",
    label: "Scadute",
    value: stats.expiredAssignments,
    href: "/assignments",
    tone: stats.expiredAssignments > 0 ? "danger" : "default",
  },
];

export const mapDashboard = (stats: CoachDashboard): DashboardViewModel => ({
  clientCount: stats.clientCount,
  isEmpty: stats.clientCount === 0,
  kpis: mapKpis(stats),
  upcoming: mapUpcoming(stats.upcomingExpirations),
  expired: mapExpired(stats.expiredAssignmentsList),
  monthPoints: mapMonthPoints(stats.expirationsByMonth),
});
