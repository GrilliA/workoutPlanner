import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getCoachClients,
  getCoachTemplates,
  type CoachClient,
  type CoachTemplate,
} from "@api";

export function useAssignmentOptions() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [templates, setTemplates] = useState<CoachTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([getCoachClients(), getCoachTemplates()])
      .then(([nextClients, nextTemplates]) => {
        if (!cancelled) {
          setClients(nextClients);
          setTemplates(nextTemplates);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setClients([]);
          setTemplates([]);
          setError(
            ApiError.messageFrom(err, "Impossibile caricare i dati di assegnazione"),
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

  return { clients, templates, loading, error, retry };
}
