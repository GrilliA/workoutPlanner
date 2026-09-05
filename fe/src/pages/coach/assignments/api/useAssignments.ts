import { useCallback, useEffect, useState } from "react";
import { ApiError, getCoachAssignments, type CoachAssignment } from "@api";

export function useAssignments() {
  const [assignments, setAssignments] = useState<CoachAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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
          setAssignments([]);
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
  }, [reloadToken]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  return { assignments, setAssignments, loading, error, retry };
}
