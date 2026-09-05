import { useEffect, useState } from "react";
import {
  ApiError,
  getCoachAnalyticsOverview,
  getCoachAssignments,
  getCoachClients,
  getCoachDashboard,
} from "@api";
import { mapDashboard } from "../mappers/mapDashboard";
import type { DashboardViewModel } from "../types";

export function useDashboard() {
  const [data, setData] = useState<DashboardViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      getCoachDashboard(),
      getCoachClients(),
      getCoachAssignments(),
      getCoachAnalyticsOverview("4w").catch(() => null),
    ])
      .then(([stats, clients, assignments, analytics]) => {
        if (!cancelled) {
          setData(mapDashboard(stats, clients, assignments, analytics));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err
              : new ApiError(400, "Impossibile caricare la dashboard"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    throw error;
  }

  return { data, loading };
}
