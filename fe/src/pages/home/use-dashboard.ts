import { useCallback, useEffect, useState } from "react";
import { ApiError, getExercisesByWorkout, getWorkouts } from "@api";
import { buildDashboardData } from "./map-dashboard";
import {
  dashboardMockEmpty,
  type DashboardData,
  type DashboardStat,
  type RecentWorkout,
  type TodayWorkout,
} from "./mock-data";

export type DashboardStatus = "loading" | "success" | "empty" | "error";

export type { DashboardData, DashboardStat, RecentWorkout, TodayWorkout };

type UseDashboardResult = {
  status: DashboardStatus;
  data: DashboardData | null;
  error: string | null;
  retry: () => void;
};

function getDevPreviewState(): DashboardStatus | null {
  const param = new URLSearchParams(window.location.search).get("state");

  if (param === "loading" || param === "empty" || param === "success") {
    return param;
  }

  return null;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const workouts = await getWorkouts();

  if (workouts.length === 0) {
    return dashboardMockEmpty;
  }

  const [newestWorkout] = [...workouts].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const exercises = await getExercisesByWorkout(newestWorkout.id);

  return buildDashboardData(workouts, exercises);
}

export function useDashboard(): UseDashboardResult {
  const previewState = getDevPreviewState();
  const [fetchId, setFetchId] = useState(0);
  const [status, setStatus] = useState<DashboardStatus>(
    previewState ?? "loading",
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retry = useCallback(() => {
    setFetchId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (previewState === "loading") {
      return;
    }

    if (previewState === "empty") {
      setStatus("empty");
      setData(dashboardMockEmpty);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setStatus("loading");
      setData(null);
      setError(null);

      try {
        const result = await fetchDashboardData();

        if (cancelled) {
          return;
        }

        const isEmpty =
          result.recentWorkouts.length === 0 && result.todayWorkout === null;

        setStatus(isEmpty ? "empty" : "success");
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
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [previewState, fetchId]);

  return { status, data, error, retry };
}
