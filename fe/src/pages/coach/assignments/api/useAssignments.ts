import { useEffect, useState } from "react";
import { getCoachAssignments, type CoachAssignment } from "@api";

export function useAssignments() {
  const [assignments, setAssignments] = useState<CoachAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getCoachAssignments()
      .then((data) => {
        if (!cancelled) {
          setAssignments(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssignments([]);
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

  return { assignments, setAssignments, loading };
}
