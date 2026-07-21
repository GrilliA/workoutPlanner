import { apiRequest } from "./client";
import { userStatsSchema, type UserStats } from "./schemas";

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
