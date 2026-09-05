import { useEffect, useState } from "react";
import { ApiError, getCoachTemplates, type CoachTemplate } from "@api";

export function useTemplates() {
  const [templates, setTemplates] = useState<CoachTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

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
          setError(
            err instanceof ApiError
              ? err
              : new ApiError(400, "Impossibile caricare i template"),
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

  return { templates, loading };
}
