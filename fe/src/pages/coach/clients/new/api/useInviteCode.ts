import { useEffect, useState } from "react";
import { ApiError, getCoachInviteCode } from "@api";

export function useInviteCode() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getCoachInviteCode()
      .then((invite) => {
        if (!cancelled) {
          setCode(invite.code);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err
              : new ApiError(400, "Impossibile caricare il codice invito"),
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

  return { code, setCode, loading };
}
