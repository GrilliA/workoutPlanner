import { useCallback, useEffect, useState } from "react";
import { ApiError, getCoachTemplates, type CoachTemplate } from "@api";

export function useTemplates() {
  const [templates, setTemplates] = useState<CoachTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void getCoachTemplates()
      .then((data) => {
        if (!cancelled) {
          setTemplates(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTemplates([]);
          setError(ApiError.messageFrom(err, "Impossibile caricare i template"));
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

  return { templates, loading, error, retry };
}
