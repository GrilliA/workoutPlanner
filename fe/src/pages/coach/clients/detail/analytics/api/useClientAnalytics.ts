import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getCoachAthleteAnalytics, type StatsRange } from "@api";
import { toast } from "@components/toast";
import { mapClientAnalytics } from "../mappers/mapClientAnalytics";
import type { ClientAnalyticsViewModel } from "../types";

export function useClientAnalytics(
  athleteId: number,
  initialRange: StatsRange = "4w",
) {
  const [range, setRange] = useState<StatsRange>(initialRange);
  const [data, setData] = useState<ClientAnalyticsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const dataRef = useRef<ClientAnalyticsViewModel | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    void getCoachAthleteAnalytics(athleteId, range)
      .then((detail) => {
        if (!cancelled) {
          setData(mapClientAnalytics(detail));
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
  }, [athleteId, range, reloadToken]);

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
