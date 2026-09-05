import { useEffect, useState } from "react";
import { ApiError, getCoachAssignments, type CoachAssignment } from "@api";

export function useAssignments() {
  const [assignments, setAssignments] = useState<CoachAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            ApiError.messageFrom(err, "Impossibile caricare le assegnazioni"),
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
    throw new Error(error);
  }

  return { assignments, setAssignments, loading };
}
