import { useEffect, useState } from "react";
import { getCoachClientProgram, type WorkoutDetail } from "@api";

export function useClientProgram(athleteId: number, workoutId: number) {
  const [program, setProgram] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getCoachClientProgram(athleteId, workoutId)
      .then((data) => {
        if (!cancelled) {
          setProgram(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProgram(null);
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

  return { program, loading };
}
