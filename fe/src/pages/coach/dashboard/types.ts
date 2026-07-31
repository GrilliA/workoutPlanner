export type DashboardKpi = {
  id: string;
  label: string;
  value: number;
  href?: string;
  tone?: "default" | "warning" | "danger";
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

export type DashboardMonthPoint = {
  month: string;
  monthLabel: string;
  count: number;
};

export type DashboardViewModel = {
  clientCount: number;
  isEmpty: boolean;
  kpis: DashboardKpi[];
  upcoming: DashboardExpirationRow[];
  expired: DashboardExpirationRow[];
  monthPoints: DashboardMonthPoint[];
};

export type DashboardStatus =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardViewModel };
