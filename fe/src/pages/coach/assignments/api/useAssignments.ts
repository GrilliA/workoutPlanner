import { useEffect, useState } from "react";
import { ApiError, getCoachAssignments, type CoachAssignment } from "@api";

export function useAssignments() {
  const [assignments, setAssignments] = useState<CoachAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getCoachAssignments()
      .then((data) => {
        if (!cancelled) {
          setAssignments(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err
              : new ApiError(400, "Impossibile caricare le assegnazioni"),
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
  }, []);

  if (error) {
    throw error;
  }

  return { assignments, setAssignments, loading };
}
