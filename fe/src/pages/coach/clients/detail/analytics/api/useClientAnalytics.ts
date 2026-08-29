import { useEffect, useState } from "react";
import { getCoachAthleteAnalytics, type StatsRange } from "@api";
import { mapClientAnalytics } from "../mappers/mapClientAnalytics";
import type { ClientAnalyticsViewModel } from "../types";

export function useClientAnalytics(
  athleteId: number,
  initialRange: StatsRange = "4w",
) {
  const [range, setRange] = useState<StatsRange>(initialRange);
  const [data, setData] = useState<ClientAnalyticsViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getCoachAthleteAnalytics(athleteId, range)
      .then((detail) => {
        if (!cancelled) {
          setData(mapClientAnalytics(detail));
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
  }, [athleteId, range]);

  const handleSetRange = (next: StatsRange) => {
    if (next === range) {
      return;
    }

    setRange(next);
  };

  return { data, loading, range, setRange: handleSetRange };
}
