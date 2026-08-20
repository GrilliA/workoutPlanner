import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import {
  getAthleteAnalytics,
  getSessionHistory,
  type AthleteAnalytics,
  type StatsRange,
} from "../../api";
import { mapProgressStats } from "./mappers/mapProgressStats";
import { mapSessionHistory } from "./mappers/mapSessionHistory";
import type { HistoryViewModel, ProgressViewModel } from "./types";

const HISTORY_PAGE_SIZE = 10;

type ProgressState = {
  analytics: ProgressViewModel | null;
  history: HistoryViewModel;
  loading: boolean;
  historyLoading: boolean;
  refreshing: boolean;
  error: string | null;
  historyError: string | null;
};

const emptyHistory: HistoryViewModel = {
  rows: [],
  page: 0,
  totalPages: 0,
  total: 0,
  canLoadMore: false,
  emptyMessage: "Nessuna sessione completata nel tuo storico.",
};

export function useProgressStats(initialRange: StatsRange = "4w") {
  const [range, setRange] = useState<StatsRange>(initialRange);
  const [fetchId, setFetchId] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [state, setState] = useState<ProgressState>({
    analytics: null,
    history: emptyHistory,
    loading: true,
    historyLoading: true,
    refreshing: false,
    error: null,
    historyError: null,
  });

  const reload = useCallback(() => {
    setFetchId((id) => id + 1);
  }, []);

  const refresh = useCallback(() => {
    setState((current) => ({ ...current, refreshing: true }));
    setHistoryPage(1);
    reload();
  }, [reload]);

  const loadMoreHistory = useCallback(() => {
    setState((current) => {
      if (current.historyLoading || !current.history.canLoadMore) {
        return current;
      }

      return { ...current, historyLoading: true };
    });
    setHistoryPage((page) => page + 1);
  }, []);

  useEffect(() => {
    setHistoryPage(1);
  }, [range, fetchId]);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const payload: AthleteAnalytics = await getAthleteAnalytics(range);
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          analytics: mapProgressStats(payload),
          loading: false,
          refreshing: false,
          error: null,
        }));
      } catch (err) {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          analytics: null,
          loading: false,
          refreshing: false,
          error: err instanceof ApiError ? err.message : "Errore caricamento progressi",
        }));
      }
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [range, fetchId]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      setState((current) => ({
        ...current,
        historyLoading: true,
        historyError: null,
      }));

      try {
        const response = await getSessionHistory({
          page: historyPage,
          limit: HISTORY_PAGE_SIZE,
        });

        if (cancelled) {
          return;
        }

        const mapped = mapSessionHistory(response);

        setState((current) => ({
          ...current,
          history:
            historyPage === 1
              ? mapped
              : {
                  ...mapped,
                  rows: [...current.history.rows, ...mapped.rows],
                },
          historyLoading: false,
          historyError: null,
        }));
      } catch (err) {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          historyLoading: false,
          historyError:
            err instanceof ApiError ? err.message : "Errore caricamento storico",
        }));
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [historyPage, fetchId]);

  return {
    range,
    setRange,
    ...state,
    reload,
    refresh,
    loadMoreHistory,
  };
}
