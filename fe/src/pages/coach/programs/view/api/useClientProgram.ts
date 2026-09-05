import { useCallback, useEffect, useState } from "react";
import { ApiError, getCoachClientProgram, type WorkoutDetail } from "@api";

export function useClientProgram(athleteId: number, workoutId: number) {
  const [program, setProgram] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void getCoachClientProgram(athleteId, workoutId)
      .then((data) => {
        if (!cancelled) {
          setProgram(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProgram(null);
          if (err instanceof ApiError && err.status === 404) {
            return;
          }
          setError(ApiError.messageFrom(err, "Impossibile caricare la scheda"));
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
  }, [athleteId, workoutId, reloadToken]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  return { program, loading, error, retry };
}
