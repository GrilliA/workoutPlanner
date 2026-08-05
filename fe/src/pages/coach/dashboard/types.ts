export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "default" | "warning" | "danger" | "accent";
};

export type DashboardExpirationRow = {
  id: number;
  athleteId: number;
  athleteLabel: string;
  workoutId: number;
  workoutName: string;
  expiresAt: string;
  timingLabel: string;
  kind: "upcoming" | "expired";
};

export type DashboardAthleteRow = {
  id: number;
  label: string;
  status: "active" | "expiring" | "paused";
  statusLabel: string;
  metaLabel: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "accent" | "default";
};

export type DashboardMonthPoint = {
  month: string;
  monthLabel: string;
  count: number;
};

export type DashboardViewModel = {
  clientCount: number;
  templateCount: number;
  isEmpty: boolean;
  kpis: DashboardKpi[];
  athletes: DashboardAthleteRow[];
  tasks: DashboardTask[];
  upcoming: DashboardExpirationRow[];
  expired: DashboardExpirationRow[];
  monthPoints: DashboardMonthPoint[];
};

export type DashboardStatus =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardViewModel };
