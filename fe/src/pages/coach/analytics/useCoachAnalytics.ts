import { useEffect, useState } from "react";
import { ApiError, type StatsRange } from "@api";
import { getCoachAnalyticsOverview } from "./api";
import { mapCoachAnalytics } from "./mappers/mapCoachAnalytics";
import type { AnalyticsStatus } from "./types";

export function useCoachAnalytics(initialRange: StatsRange = "4w"): AnalyticsStatus & {
  range: StatsRange;
  setRange: (range: StatsRange) => void;
} {
  const [range, setRange] = useState<StatsRange>(initialRange);
  const [state, setState] = useState<AnalyticsStatus>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void getCoachAnalyticsOverview(range)
      .then((overview) => {
        if (!cancelled) {
          setState({ status: "ready", data: mapCoachAnalytics(overview) });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof ApiError ? err.message : "Errore caricamento analisi",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const handleSetRange = (next: StatsRange) => {
    if (next !== range) {
      setState({ status: "loading" });
    }
    setRange(next);
  };

  return { ...state, range, setRange: handleSetRange };
}
