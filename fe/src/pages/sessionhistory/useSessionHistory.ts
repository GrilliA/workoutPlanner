import { useEffect, useState } from "react";
import { ApiError } from "@api";
import { fetchSessionHistoryPage } from "./api";
import { mapSessionHistory } from "./mappers/mapSessionHistory";
import type { SessionHistoryStatus, SessionHistoryView } from "./types";

type UseSessionHistoryResult = {
  status: SessionHistoryStatus;
  view: SessionHistoryView | null;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  retry: () => void;
};

export function useSessionHistory(): UseSessionHistoryResult {
  const [page, setPage] = useState(1);
  const [fetchId, setFetchId] = useState(0);
  const [status, setStatus] = useState<SessionHistoryStatus>("loading");
  const [view, setView] = useState<SessionHistoryView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retry = () => {
    setFetchId((current) => current + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);

      try {
        const response = await fetchSessionHistoryPage(page);

        if (cancelled) {
          return;
        }

        setView({
          items: mapSessionHistory(response),
          page: response.page,
          totalPages: response.totalPages,
          total: response.total,
        });
        setStatus("ready");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setView(null);
        setStatus("error");
        setError(
          err instanceof ApiError
            ? err.message
            : "Impossibile caricare lo storico sessioni",
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, fetchId]);

  return {
    status,
    view,
    error,
    page,
    setPage,
    retry,
  };
}
