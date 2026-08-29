import { useEffect, useState } from "react";
import {
  getCoachClients,
  getCoachTemplates,
  type CoachClient,
  type CoachTemplate,
} from "@api";

export function useAssignmentOptions() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [templates, setTemplates] = useState<CoachTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([getCoachClients(), getCoachTemplates()])
      .then(([nextClients, nextTemplates]) => {
        if (!cancelled) {
          setClients(nextClients);
          setTemplates(nextTemplates);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClients([]);
          setTemplates([]);
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

  return { clients, templates, loading };
}
