import { useEffect, useState } from "react";
import { ApiError, getCoachClient, type CoachClientDetail } from "@api";

export function useClientDetail(athleteId: number) {
  const [detail, setDetail] = useState<CoachClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

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
          if (err instanceof ApiError && err.status === 404) {
            setDetail(null);
            return;
          }
          setError(
            err instanceof ApiError
              ? err
              : new ApiError(400, "Impossibile caricare il cliente"),
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
  }, [athleteId]);

  if (error) {
    throw error;
  }

  return { detail, setDetail, loading };
}
