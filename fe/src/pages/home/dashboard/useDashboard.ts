import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@api";
import { fetchDashboardData } from "./api";
import type { DashboardData, DashboardStatus } from "./types";
import { isDashboardEmpty } from "./mappers/mapDashboard";

type UseDashboardResult = {
  status: DashboardStatus;
  data: DashboardData | null;
  error: string | null;
  retry: () => void;
};

const isLoadingPreview = () =>
  new URLSearchParams(window.location.search).get("state") === "loading";

export function useDashboard(): UseDashboardResult {
  const loadingPreview = isLoadingPreview();
  const [fetchId, setFetchId] = useState(0);
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retry = useCallback(() => {
    setFetchId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (loadingPreview) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setData(null);
      setError(null);

      try {
        const result = await fetchDashboardData();

        if (cancelled) {
          return;
        }

        setStatus(isDashboardEmpty(result) ? "empty" : "success");
        setData(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setData(null);
        setError(
          err instanceof ApiError
            ? err.message
            : "Impossibile caricare la dashboard",
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadingPreview, fetchId]);

  return { status, data, error, retry };
}
