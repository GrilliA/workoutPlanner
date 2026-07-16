import { useEffect, useState } from "react";
import { ApiError, getStats } from "@api";
import { useAuth } from "@auth";
import { buildProgressData, isProgressEmpty } from "./mappers/mapProgress";
import type { ProgressData, ProgressStatus } from "./types";

const RECENT_SESSIONS_PREVIEW_COUNT = 3;

type UseProgressResult = {
  status: ProgressStatus;
  data: ProgressData | null;
  error: string | null;
  retry: () => void;
};

export function useProgress(): UseProgressResult {
  const { status: authStatus } = useAuth();
  const [fetchId, setFetchId] = useState(0);
  const [status, setStatus] = useState<ProgressStatus>("loading");
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retry = () => {
    setFetchId((current) => current + 1);
  };

  useEffect(() => {
    if (authStatus === "loading" || authStatus === "anonymous") {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setData(null);
      setError(null);

      try {
        const stats = await getStats({ recentLimit: RECENT_SESSIONS_PREVIEW_COUNT });
        const result = buildProgressData(stats);

        if (cancelled) {
          return;
        }

        setStatus(isProgressEmpty(result) ? "empty" : "success");
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
            : "Impossibile caricare i progressi",
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchId, authStatus]);

  return { status, data, error, retry };
}
