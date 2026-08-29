import { useEffect, useState } from "react";
import {
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
      .catch(() => {
        if (!cancelled) {
          setData(null);
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

  return { data, loading };
}
