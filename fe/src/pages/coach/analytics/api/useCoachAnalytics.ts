import { useEffect, useRef, useState } from "react";
import { ApiError, getCoachAnalyticsOverview, type StatsRange } from "@api";
import { toast } from "@components/toast";
import { mapCoachAnalytics } from "../mappers/mapCoachAnalytics";
import type { AnalyticsViewModel } from "../types";

export function useCoachAnalytics(initialRange: StatsRange = "4w") {
  const [range, setRange] = useState<StatsRange>(initialRange);
  const [data, setData] = useState<AnalyticsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
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
          if (dataRef.current) {
            toast.error(
              ApiError.messageFrom(err, "Impossibile caricare le analisi"),
            );
            return;
          }
          setError(
            err instanceof ApiError
              ? err
              : new ApiError(400, "Impossibile caricare le analisi"),
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
  }, [range]);

  const handleSetRange = (next: StatsRange) => {
    if (next === range) {
      return;
    }

    setRange(next);
  };

  if (error) {
    throw error;
  }

  return { data, loading, range, setRange: handleSetRange };
}
