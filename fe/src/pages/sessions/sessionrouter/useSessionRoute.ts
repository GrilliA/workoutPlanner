import { useEffect, useState } from "react";
import { ApiError, getSession } from "@api";

export type SessionRouteMode = "loading" | "active" | "recap" | "error";

type UseSessionRouteResult = {
  mode: SessionRouteMode;
  error: string | null;
  retry: () => void;
};

export function useSessionRoute(sessionId: number): UseSessionRouteResult {
  const [fetchId, setFetchId] = useState(0);
  const [mode, setMode] = useState<SessionRouteMode>("loading");
  const [error, setError] = useState<string | null>(null);

  const retry = () => {
    setFetchId((current) => current + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setMode("loading");
      setError(null);

      try {
        const session = await getSession(sessionId);

        if (cancelled) {
          return;
        }

        setMode(session.status === "in_progress" ? "active" : "recap");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setMode("error");
        setError(
          err instanceof ApiError
            ? err.message
            : "Impossibile caricare la sessione",
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, fetchId]);

  return { mode, error, retry };
}
