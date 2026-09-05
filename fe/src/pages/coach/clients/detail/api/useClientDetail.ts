import { useEffect, useState } from "react";
import { ApiError, getCoachClient, type CoachClientDetail } from "@api";

export function useClientDetail(athleteId: number) {
  const [detail, setDetail] = useState<CoachClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [athleteId]);

  if (error) {
    throw new Error(error);
  }

  return { detail, setDetail, loading };
}
