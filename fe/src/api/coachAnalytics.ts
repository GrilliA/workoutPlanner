import { apiRequest } from "./client";
import {
  coachAnalyticsOverviewSchema,
  coachAthleteAnalyticsSchema,
  statsRangeSchema,
  type StatsRange,
} from "./schemas/coachAnalytics";

export const getCoachAnalyticsOverview = (range: StatsRange = "4w") =>
  apiRequest(`/coach/analytics/overview?range=${statsRangeSchema.parse(range)}`, {
    schema: coachAnalyticsOverviewSchema,
  });

export const getCoachAthleteAnalytics = (athleteId: number, range: StatsRange = "4w") =>
  apiRequest(`/coach/analytics/clients/${athleteId}?range=${statsRangeSchema.parse(range)}`, {
    schema: coachAthleteAnalyticsSchema,
  });
