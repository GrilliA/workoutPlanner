import { useEffect, useState } from "react";
import { ApiError } from "@api";
import { getCoachDashboard } from "./api";
import { mapDashboard } from "./mappers/mapDashboard";
import type { DashboardStatus } from "./types";

export function useDashboard(): DashboardStatus {
  const [state, setState] = useState<DashboardStatus>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void getCoachDashboard()
      .then((stats) => {
        if (!cancelled) {
          setState({ status: "ready", data: mapDashboard(stats) });
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
