import { and, eq, ne } from "drizzle-orm";
import { db } from "../db";
import { programAssignments } from "../db/schema";
import { todayInRome } from "./assignmentStatus";
import {
  buildCoachAlerts,
  buildRangePeriods,
  compareAlertSeverity,
  parseStatsRange,
  type CoachAlert,
  type StatsRange,
  type WeeklySeriesPoint,
} from "./analytics";
import { listCoachAthletes } from "./coachAthleteAccess";
import {
  loadActiveProgramExpiry,
  loadAthleteAnalytics,
  loadLastSessionDate,
} from "./analyticsAccess";

export { parseStatsRange };

export type CoachAnalyticsOverview = {
  range: StatsRange;
  period: { from: string; to: string };
  clientCount: number;
  athletesActiveInPeriod: number;
  sessionsCompletedTotal: number;
  clientsToReviewCount: number;
  weeklySeries: WeeklySeriesPoint[];
  alerts: CoachAlert[];
  clients: Array<{
    athleteId: number;
    athleteName: string | null;
    lastSessionDate: string | null;
    sessionsCompleted: number;
    alertCount: number;
  }>;
};

/** Sum portfolio weekly points without extra DB queries. */
export const aggregatePortfolioWeeklySeries = (
  seriesList: WeeklySeriesPoint[][],
): WeeklySeriesPoint[] => {
  const byWeek = new Map<string, WeeklySeriesPoint>();

  for (const series of seriesList) {
    for (const point of series) {
      const existing = byWeek.get(point.weekStart);

      if (existing) {
        byWeek.set(point.weekStart, {
          weekStart: point.weekStart,
          weekEnd: point.weekEnd > existing.weekEnd ? point.weekEnd : existing.weekEnd,
          sessionCount: existing.sessionCount + point.sessionCount,
          volumeKg: existing.volumeKg + point.volumeKg,
        });
      } else {
        byWeek.set(point.weekStart, { ...point });
      }
    }
  }

  return [...byWeek.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
};

export const countDistinctAlertAthletes = (alerts: CoachAlert[]): number =>
  new Set(alerts.map((alert) => alert.athleteId)).size;

export const loadCoachAnalyticsOverview = async (
  coachId: number,
  range: StatsRange,
): Promise<CoachAnalyticsOverview> => {
  const clients = await listCoachAthletes(coachId);
  const today = todayInRome();
  const periods = buildRangePeriods(range, today);

  const alerts: CoachAlert[] = [];
  const clientSummaries: CoachAnalyticsOverview["clients"] = [];
  const weeklySeriesList: WeeklySeriesPoint[][] = [];
  let sessionsCompletedTotal = 0;
  let athletesActiveInPeriod = 0;

  for (const client of clients) {
    const lastSessionDate = await loadLastSessionDate(client.id);
    const programExpiresAt = await loadActiveProgramExpiry(client.id, today);

    const clientAlerts = buildCoachAlerts({
      athleteId: client.id,
      athleteName: client.name,
      lastSessionDate,
      programExpiresAt,
      today,
    });

    alerts.push(...clientAlerts);

    const analytics = await loadAthleteAnalytics(client.id, range);
    weeklySeriesList.push(analytics.weeklySeries);
    sessionsCompletedTotal += analytics.sessionsCompleted;

    if (analytics.sessionsCompleted > 0) {
      athletesActiveInPeriod += 1;
    }

    clientSummaries.push({
      athleteId: client.id,
      athleteName: client.name,
      lastSessionDate,
      sessionsCompleted: analytics.sessionsCompleted,
      alertCount: clientAlerts.length,
    });
  }

  const sortedAlerts = alerts.sort(compareAlertSeverity);

  return {
    range,
    period: periods.current,
    clientCount: clients.length,
    athletesActiveInPeriod,
    sessionsCompletedTotal,
    clientsToReviewCount: countDistinctAlertAthletes(sortedAlerts),
    weeklySeries: aggregatePortfolioWeeklySeries(weeklySeriesList),
    alerts: sortedAlerts,
    clients: clientSummaries,
  };
};

export const loadCoachAthleteAnalytics = async (
  coachId: number,
  athleteId: number,
  range: StatsRange,
) => {
  const { getCoachAthlete } = await import("./coachAthleteAccess");
  const client = await getCoachAthlete(coachId, athleteId);

  if (!client) {
    return null;
  }

  const today = todayInRome();

  const [assignment] = await db
    .select({
      expiresAt: programAssignments.expiresAt,
      startsAt: programAssignments.startsAt,
    })
    .from(programAssignments)
    .where(
      and(
        eq(programAssignments.coachId, coachId),
        eq(programAssignments.athleteId, athleteId),
        ne(programAssignments.status, "revoked"),
      ),
    )
    .limit(1);

  const analytics = await loadAthleteAnalytics(athleteId, range);
  const alerts = buildCoachAlerts({
    athleteId,
    athleteName: client.name,
    lastSessionDate: await loadLastSessionDate(athleteId),
    programExpiresAt: assignment?.expiresAt ?? null,
    today,
  });

  return {
    client,
    assignment: assignment ?? null,
    alerts,
    analytics,
  };
};
