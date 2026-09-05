import { useCallback, useEffect, useState } from "react";
import { ApiError, getCoachClient, type CoachClientDetail } from "@api";

export function useClientDetail(athleteId: number) {
  const [detail, setDetail] = useState<CoachClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void getCoachClient(athleteId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          if (err instanceof ApiError && err.status === 404) {
            return;
          }
          setError(
            ApiError.messageFrom(err, "Impossibile caricare il cliente"),
          );
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
  }, [athleteId, reloadToken]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  return { detail, setDetail, loading, error, retry };
}
