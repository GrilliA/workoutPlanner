import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getCoachAnalyticsOverview, type StatsRange } from "@api";
import { toast } from "@components/toast";
import { mapCoachAnalytics } from "../mappers/mapCoachAnalytics";
import type { AnalyticsViewModel } from "../types";

export function useCoachAnalytics(initialRange: StatsRange = "4w") {
  const [range, setRange] = useState<StatsRange>(initialRange);
  const [data, setData] = useState<AnalyticsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const dataRef = useRef<AnalyticsViewModel | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    void getCoachAnalyticsOverview(range)
      .then((overview) => {
        if (!cancelled) {
          setData(mapCoachAnalytics(overview));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = ApiError.messageFrom(
            err,
            "Impossibile caricare le analisi",
          );
          if (dataRef.current) {
            toast.error(message);
            return;
          }
          setError(message);
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
  }, [range, reloadToken]);

  const handleSetRange = (next: StatsRange) => {
    if (next === range) {
      return;
    }

    setRange(next);
  };

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  return { data, loading, error, retry, range, setRange: handleSetRange };
}
