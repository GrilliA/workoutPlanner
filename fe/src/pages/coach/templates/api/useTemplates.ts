import { useEffect, useState } from "react";
import { ApiError, getCoachTemplates, type CoachTemplate } from "@api";

export function useTemplates() {
  const [templates, setTemplates] = useState<CoachTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  if (error) {
    throw new Error(error);
  }

  return { templates, loading };
}
