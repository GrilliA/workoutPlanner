import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CoachAssignment,
  CoachClient,
  CoachDashboard,
} from "../../../../api/schemas/coach.ts";
import { mapAthletes, mapDashboard } from "./mapDashboard.ts";

const today = "2026-09-09";

const client = (id: number, email: string, name: string | null = null): CoachClient => ({
  id,
  email,
  name,
  createdAt: "2026-01-01T00:00:00.000Z",
  linkedAt: "2026-01-01T00:00:00.000Z",
});

const assignment = (
  athleteId: number,
  status: CoachAssignment["status"],
  expiresAt: string,
): CoachAssignment => ({
  id: athleteId,
  workoutId: 10,
  coachId: 1,
  athleteId,
  startsAt: "2026-08-01",
  expiresAt,
  status,
  workoutName: "Forza",
});

const dashboardStats = (
  renewalsByWeek: CoachDashboard["renewalsByWeek"],
): CoachDashboard => ({
  clientCount: 1,
  templateCount: 2,
  activeAssignments: 1,
  scheduledAssignments: 0,
  expiringIn7Days: 99,
  expiringIn14Days: 0,
  expiringIn30Days: 0,
  expiredAssignments: 0,
  expirationsByMonth: [],
  renewalsByWeek,
  upcomingExpirations: [],
  expiredAssignmentsList: [],
  recentActivity: [],
});

describe("mapDashboard renewals", () => {
  it("labels each week with its full range and uses that count for the KPI", () => {
    const view = mapDashboard(
      dashboardStats([
        { weekStart: "2026-09-07", weekEnd: "2026-09-13", count: 2 },
        { weekStart: "2026-09-14", weekEnd: "2026-09-20", count: 0 },
        { weekStart: "2026-09-21", weekEnd: "2026-09-27", count: 0 },
        { weekStart: "2026-09-28", weekEnd: "2026-10-04", count: 1 },
      ]),
    );

    assert.deepEqual(
      view.renewalChart.bars.map((bar) => bar.label),
      ["7/9–13/9", "14/9–20/9", "21/9–27/9", "28/9–4/10"],
    );
    assert.equal(
      view.renewalChart.bars[0]?.accessibilityLabel,
      "Settimana 7/9–13/9, 2 rinnovi",
    );
    assert.equal(
      view.renewalChart.bars[3]?.accessibilityLabel,
      "Settimana 28/9–4/10, 1 rinnovo",
    );
    assert.equal(view.renewalChart.summary, "3 schede scadono nelle prossime 4 settimane.");

    const expiring = view.kpis.find((kpi) => kpi.id === "expiring7");
    assert.equal(expiring?.value, "2");
    assert.equal(expiring?.hint, "Questa settimana");
    assert.equal(expiring?.tone, "warning");
  });
});

describe("mapAthletes", () => {
  it("marks an expired program separately from one due within 7 days", () => {
    const rows = mapAthletes(
      [
        client(1, "a@example.com", "Anna"),
        client(2, "b@example.com", "Bruno"),
        client(3, "c@example.com", "Chiara"),
      ],
      [
        assignment(1, "expired", "2026-08-01"),
        assignment(2, "active", "2026-09-16"),
        assignment(3, "active", "2026-09-17"),
      ],
      today,
    );

    assert.deepEqual(
      rows.map((row) => ({ status: row.status, statusLabel: row.statusLabel })),
      [
        { status: "expired", statusLabel: "Scaduto" },
        { status: "expiring", statusLabel: "In scadenza" },
        { status: "active", statusLabel: "Attivo" },
      ],
    );
  });
});
