import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DONE_FLASH_MS = 3000;
const TICK_MS = 250;

export type RestTimerStatus = "idle" | "running" | "done";

const readRemainingSec = (endsAt: number): number =>
  Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

/**
 * Rest timer for active workout sessions.
 * Uses Expo Notifications (background alert) + Haptics (foreground) —
 * the RN replacement for the old Capacitor Local Notifications path.
 */
export function useRestTimer(sessionId: number) {
  const [status, setStatus] = useState<RestTimerStatus>("idle");
  const [remainingSec, setRemainingSec] = useState(0);
  const [totalSec, setTotalSec] = useState(0);
  const [restingExerciseId, setRestingExerciseId] = useState<number | null>(null);

  const endsAtRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const notificationIdRef = useRef<string | null>(null);
  const appInForegroundRef = useRef(true);

  const cancelNotification = useCallback(async () => {
    if (notificationIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
      notificationIdRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    endsAtRef.current = null;
    firedRef.current = false;
    setStatus("idle");
    setRemainingSec(0);
    setTotalSec(0);
    setRestingExerciseId(null);
    void cancelNotification();
  }, [cancelNotification]);

  const fireDone = useCallback(async () => {
    if (firedRef.current || endsAtRef.current === null) {
      return;
    }

    firedRef.current = true;
    setRemainingSec(0);
    setStatus("done");
    await cancelNotification();

    if (appInForegroundRef.current) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Simulator may not support haptics.
      }
    }

    setTimeout(() => {
      endsAtRef.current = null;
      firedRef.current = false;
      setStatus("idle");
      setRemainingSec(0);
      setTotalSec(0);
      setRestingExerciseId(null);
    }, DONE_FLASH_MS);
  }, [cancelNotification]);

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

      const permission = await Notifications.requestPermissionsAsync();

      if (permission.granted) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Recupero finito",
            body: "Vai con la prossima serie",
            data: { sessionId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(endsAt),
          },
        });
        notificationIdRef.current = id;
      }
    },
    [cancel, sessionId],
  );

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const intervalId = setInterval(checkExpiry, TICK_MS);
    return () => clearInterval(intervalId);
  }, [checkExpiry, status]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appInForegroundRef.current = next === "active";

      if (next === "active") {
        checkExpiry();
      }
    });

    return () => sub.remove();
  }, [checkExpiry]);

  return {
    status,
    remainingSec,
    totalSec,
    restingExerciseId,
    start,
    skip: cancel,
    cancel,
  };
}
