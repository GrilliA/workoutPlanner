import { useEffect, useState } from "react";
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
  const [error, setError] = useState<ApiError | null>(null);

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
          setError(
            err instanceof ApiError
              ? err
              : new ApiError(400, "Impossibile caricare i dati di assegnazione"),
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

  return { clients, templates, loading };
}
