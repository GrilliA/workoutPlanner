import { useEffect, useState } from "react";
import { ApiError, type StatsRange } from "@api";
import { getCoachAthleteAnalytics } from "./api";
import { mapClientAnalytics } from "./mappers/mapClientAnalytics";
import type { ClientAnalyticsStatus } from "./types";

export function useClientAnalytics(
  athleteId: number,
  initialRange: StatsRange = "4w",
): ClientAnalyticsStatus & {
  range: StatsRange;
  setRange: (range: StatsRange) => void;
} {
  const [range, setRange] = useState<StatsRange>(initialRange);
  const [state, setState] = useState<ClientAnalyticsStatus>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void getCoachAthleteAnalytics(athleteId, range)
      .then((detail) => {
        if (!cancelled) {
          setState({ status: "ready", data: mapClientAnalytics(detail) });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              err instanceof ApiError ? err.message : "Errore caricamento analisi cliente",
          });
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

    setState((current) =>
      current.status === "ready" || current.status === "refreshing"
        ? { status: "refreshing", data: current.data }
        : { status: "loading" },
    );
    setRange(next);
  };

  return { ...state, range, setRange: handleSetRange };
}
