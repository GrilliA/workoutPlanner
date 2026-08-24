import { useEffect, useState } from "react";
import { ApiError, getCoachAnalyticsOverview } from "@api";
import {
  getCoachAssignments,
  getCoachClients,
  getCoachDashboard,
} from "./api";
import { mapDashboard } from "./mappers/mapDashboard";
import type { DashboardStatus } from "./types";

export function useDashboard(): DashboardStatus {
  const [state, setState] = useState<DashboardStatus>({ status: "loading" });

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
          setState({
            status: "ready",
            data: mapDashboard(stats, clients, assignments, analytics),
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof ApiError ? err.message : "Errore caricamento",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
