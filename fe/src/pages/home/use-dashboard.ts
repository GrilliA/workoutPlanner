import { useEffect, useState } from "react";
import {
  dashboardMock,
  dashboardMockEmpty,
  type DashboardStat,
  type RecentWorkout,
  type TodayWorkout,
} from "./mock-data";

export type DashboardStatus = "loading" | "success" | "empty" | "error";

export type DashboardData = {
  userName: string;
  todayWorkout: TodayWorkout | null;
  stats: DashboardStat[];
  recentWorkouts: RecentWorkout[];
};

type UseDashboardResult = {
  status: DashboardStatus;
  data: DashboardData | null;
  error: string | null;
};

const MOCK_DELAY_MS = 500;

function getDevPreviewState(): DashboardStatus | null {
  const param = new URLSearchParams(window.location.search).get("state");

  if (param === "loading" || param === "empty" || param === "success") {
    return param;
  }

  return null;
}

function resolveMockData(status: DashboardStatus): DashboardData {
  if (status === "empty") {
    return dashboardMockEmpty;
  }

  return dashboardMock;
}

export function useDashboard(): UseDashboardResult {
  const previewState = getDevPreviewState();
  const [status, setStatus] = useState<DashboardStatus>(
    previewState ?? "loading",
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (previewState === "loading") {
      return;
    }

    if (previewState) {
      setTimeout(() => {
        setStatus(previewState);
        setData(resolveMockData(previewState));
        setError(null);
      }, 0);
      return;
    }

    setTimeout(() => {
      setStatus("loading");
      setData(null);
      setError(null);
    }, 0);

    const timer = window.setTimeout(() => {
      setStatus("success");
      setData(dashboardMock);
    }, MOCK_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [previewState]);

  return { status, data, error };
}
