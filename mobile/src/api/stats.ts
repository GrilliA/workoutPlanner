import { apiRequest } from "./client";
import {
  athleteAnalyticsSchema,
  statsRangeSchema,
  userStatsSchema,
  type AthleteAnalytics,
  type StatsRange,
  type UserStats,
} from "./schemas";

type GetStatsOptions = {
  recentLimit?: number;
};

export async function getStats(options: GetStatsOptions = {}): Promise<UserStats> {
  const searchParams = new URLSearchParams();

  if (options.recentLimit !== undefined) {
    searchParams.set("recentLimit", String(options.recentLimit));
  }

  const query = searchParams.toString();
  const path = query ? `/stats?${query}` : "/stats";

  return apiRequest(path, { schema: userStatsSchema });
}

export async function getAthleteAnalytics(range: StatsRange): Promise<AthleteAnalytics> {
  const parsedRange = statsRangeSchema.parse(range);

  return apiRequest(`/stats?range=${parsedRange}`, {
    schema: athleteAnalyticsSchema,
  });
}
