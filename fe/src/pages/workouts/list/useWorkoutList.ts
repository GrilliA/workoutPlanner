import { useEffect, useState } from "react";
import { ApiError, getWorkouts, type Workout } from "@api";

type WorkoutListStatus = "loading" | "success" | "empty" | "error";

type UseWorkoutListResult = {
  status: WorkoutListStatus;
  workouts: Workout[];
  error: string | null;
  retry: () => void;
};

export function useWorkoutList(): UseWorkoutListResult {
  const [fetchId, setFetchId] = useState(0);
  const [status, setStatus] = useState<WorkoutListStatus>("loading");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
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
        const result = await getWorkouts();

        if (cancelled) {
          return;
        }

        setWorkouts(result);
        setStatus(result.length === 0 ? "empty" : "success");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setWorkouts([]);
        setStatus("error");
        setError(
          err instanceof ApiError
            ? err.message
            : "Impossibile caricare le schede",
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchId]);

  return { status, workouts, error, retry };
}
