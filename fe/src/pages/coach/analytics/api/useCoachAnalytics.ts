import { useEffect, useState } from "react";
import { getCoachAnalyticsOverview, type StatsRange } from "@api";
import { mapCoachAnalytics } from "../mappers/mapCoachAnalytics";
import type { AnalyticsViewModel } from "../types";

export function useCoachAnalytics(initialRange: StatsRange = "4w") {
  const [range, setRange] = useState<StatsRange>(initialRange);
  const [data, setData] = useState<AnalyticsViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getCoachAnalyticsOverview(range)
      .then((overview) => {
        if (!cancelled) {
          setData(mapCoachAnalytics(overview));
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
  }, [range]);

  const handleSetRange = (next: StatsRange) => {
    if (next === range) {
      return;
    }

    setRange(next);
  };

  return { data, loading, range, setRange: handleSetRange };
}
