import { useEffect, useState } from "react";
import { ApiError, getCoachClientProgram, type WorkoutDetail } from "@api";

export function useClientProgram(athleteId: number, workoutId: number) {
  const [program, setProgram] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          if (err instanceof ApiError && err.status === 404) {
            setProgram(null);
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
  }, [athleteId, workoutId]);

  if (error) {
    throw new Error(error);
  }

  return { program, loading };
}
