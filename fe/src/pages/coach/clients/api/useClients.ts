import { useEffect, useState } from "react";
import { getCoachClients, type CoachClient } from "@api";

export function useClients() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getCoachClients()
      .then((data) => {
        if (!cancelled) {
          setClients(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClients([]);
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

  return { clients, loading };
}
