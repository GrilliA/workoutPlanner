import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelRestAlert,
  playRestDoneAlert,
  scheduleRestAlert,
} from "./restTimerService";
import type { RestTimerStatus } from "./types";

const DONE_FLASH_MS = 3000;
const TICK_MS = 250;

const readRemainingSec = (endsAt: number): number =>
  Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

export type UseRestTimerResult = {
  status: RestTimerStatus;
  remainingSec: number;
  totalSec: number;
  restingExerciseId: number | null;
  start: (restSec: number, exerciseId: number) => Promise<void>;
  skip: () => void;
  cancel: () => void;
};

export function useRestTimer(sessionId: number): UseRestTimerResult {
  const [status, setStatus] = useState<RestTimerStatus>("idle");
  const [remainingSec, setRemainingSec] = useState(0);
  const [totalSec, setTotalSec] = useState(0);
  const [restingExerciseId, setRestingExerciseId] = useState<number | null>(null);

  const endsAtRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const appInForegroundRef = useRef(true);

  const syncRemaining = useCallback(() => {
    const endsAt = endsAtRef.current;

    if (!endsAt) {
      return;
    }

    setRemainingSec(readRemainingSec(endsAt));
  }, []);

  const cancel = useCallback(() => {
    endsAtRef.current = null;
    firedRef.current = false;
    setStatus("idle");
    setRemainingSec(0);
    setTotalSec(0);
    setRestingExerciseId(null);
    void cancelRestAlert();
  }, []);

  const fireDone = useCallback(async () => {
    if (firedRef.current || endsAtRef.current === null) {
      return;
    }

    firedRef.current = true;
    setRemainingSec(0);
    setStatus("done");

    await playRestDoneAlert(sessionId, appInForegroundRef.current);

    window.setTimeout(() => {
      endsAtRef.current = null;
      firedRef.current = false;
      setStatus("idle");
      setRemainingSec(0);
      setTotalSec(0);
      setRestingExerciseId(null);
    }, DONE_FLASH_MS);
  }, [sessionId]);

  const checkExpiry = useCallback(() => {
    const endsAt = endsAtRef.current;

    if (!endsAt || firedRef.current) {
      return;
    }

    const remaining = readRemainingSec(endsAt);
    setRemainingSec(remaining);

    if (remaining <= 0) {
      void fireDone();
    }
  }, [fireDone]);

  const start = useCallback(
    async (restSec: number, exerciseId: number) => {
      cancel();

      const endsAt = Date.now() + restSec * 1000;
      endsAtRef.current = endsAt;
      firedRef.current = false;
      setTotalSec(restSec);
      setRemainingSec(restSec);
      setRestingExerciseId(exerciseId);
      setStatus("running");

      await scheduleRestAlert(new Date(endsAt), sessionId);
    },
    [cancel, sessionId],
  );

  const skip = useCallback(() => {
    cancel();
  }, [cancel]);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const intervalId = window.setInterval(checkExpiry, TICK_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [checkExpiry, status]);

  useEffect(() => {
    const onVisibilityChange = () => {
      appInForegroundRef.current = document.visibilityState === "visible";

      if (document.visibilityState === "visible") {
        syncRemaining();
        checkExpiry();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkExpiry, syncRemaining]);

  return {
    status,
    remainingSec,
    totalSec,
    restingExerciseId,
    start,
    skip,
    cancel,
  };
}
