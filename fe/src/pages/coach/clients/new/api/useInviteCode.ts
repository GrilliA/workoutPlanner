import { useEffect, useState } from "react";
import { getCoachInviteCode } from "@api";

export function useInviteCode() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getCoachInviteCode()
      .then((invite) => {
        if (!cancelled) {
          setCode(invite.code);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCode(null);
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

  return { code, setCode, loading };
}
