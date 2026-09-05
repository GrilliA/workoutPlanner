import { useCallback, useEffect, useState } from "react";
import { ApiError, getCoachInviteCode } from "@api";

export function useInviteCode() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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
          setCode(null);
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
  }, [reloadToken]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  return { code, setCode, loading, error, retry };
}
