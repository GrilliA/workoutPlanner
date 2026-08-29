import { useEffect, useState } from "react";
import { getCoachClient, type CoachClientDetail } from "@api";

export function useClientDetail(athleteId: number) {
  const [detail, setDetail] = useState<CoachClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getCoachClient(athleteId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
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

  return { detail, setDetail, loading };
}
