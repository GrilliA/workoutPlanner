import { useEffect, useState } from "react";
import { ApiError, getCoachInviteCode } from "@api";

export function useInviteCode() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            ApiError.messageFrom(err, "Impossibile caricare il codice invito"),
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
    throw new Error(error);
  }

  return { code, setCode, loading };
}
