import { useCallback, useEffect, useState } from "react";
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
  const [reloadToken, setReloadToken] = useState(0);

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
          setData(null);
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
  }, [reloadToken]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  return { data, loading, error, retry };
}
