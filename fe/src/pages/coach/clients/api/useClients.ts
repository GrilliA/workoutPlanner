import { useCallback, useEffect, useState } from "react";
import { ApiError, getCoachClients, type CoachClient } from "@api";

export function useClients() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void getCoachClients()
      .then((data) => {
        if (!cancelled) {
          setClients(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setClients([]);
          setError(ApiError.messageFrom(err, "Impossibile caricare i clienti"));
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

  return { clients, loading, error, retry };
}
