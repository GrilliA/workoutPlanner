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
  const [error, setError] = useState<string | null>(null);

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
            ApiError.messageFrom(err, "Impossibile caricare la dashboard"),
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
    throw new Error(error);
  }

  return { data, loading };
}
