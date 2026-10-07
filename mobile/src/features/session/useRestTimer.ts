import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import {
  endRestTimerActivities,
  startRestTimerActivity,
} from "./RestTimerActivity";
import {
  clearRestNotification,
  ensureRestTimerPermission,
  REST_SKIP_ACTION_ID,
  scheduleRestDoneNotification,
  scheduleRestOngoingNotification,
} from "./restTimerNotifications";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    if (data?.type === "rest-ongoing") {
      return {
        shouldShowBanner: false,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    if (
      data?.type === "rest-done" &&
      Number(data?.sessionId) === mountedRestSessionId
    ) {
      return {
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

let mountedRestSessionId: number | null = null;

const DONE_FLASH_MS = 700;
const TICK_MS = 250;

export type RestTimerStatus = "idle" | "running" | "done";

const readRemainingSec = (endsAt: number): number =>
  Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

/**
 * Rest timer for active workout sessions.
 * Sticky ongoing notification while recovering + scheduled alert at end.
 */
export function useRestTimer(sessionId: number) {
  const [status, setStatus] = useState<RestTimerStatus>("idle");
  const [remainingSec, setRemainingSec] = useState(0);
  const [totalSec, setTotalSec] = useState(0);
  const [restingExerciseId, setRestingExerciseId] = useState<number | null>(null);

  const endsAtRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const ongoingNotificationIdRef = useRef<string | null>(null);
  const doneNotificationIdRef = useRef<string | null>(null);
  const appInForegroundRef = useRef(true);

  const clearNotifications = useCallback(async () => {
    const ongoingId = ongoingNotificationIdRef.current;
    const doneId = doneNotificationIdRef.current;
    ongoingNotificationIdRef.current = null;
    doneNotificationIdRef.current = null;
    await Promise.all([clearRestNotification(ongoingId), clearRestNotification(doneId)]);
  }, []);

  const dismissOngoingOnly = useCallback(async () => {
    const ongoingId = ongoingNotificationIdRef.current;
    ongoingNotificationIdRef.current = null;
    await clearRestNotification(ongoingId);
  }, []);

  const cancel = useCallback(() => {
    endsAtRef.current = null;
    firedRef.current = false;
    setStatus("idle");
    setRemainingSec(0);
    setTotalSec(0);
    setRestingExerciseId(null);
    void clearNotifications();
    endRestTimerActivities();
  }, [clearNotifications]);

  const fireDone = useCallback(async () => {
    if (firedRef.current || endsAtRef.current === null) {
      return;
    }

    firedRef.current = true;
    setRemainingSec(0);
    setStatus("done");
    await clearNotifications();
    endRestTimerActivities();

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
  }, [clearNotifications]);

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
      startRestTimerActivity({ sessionId, startedAtMs: Date.now(), endsAtMs: endsAt });

      try {
        const [ongoingId, doneId] = await Promise.all([
          scheduleRestOngoingNotification({
            sessionId,
            endsAtMs: endsAt,
            restSec,
          }),
          scheduleRestDoneNotification({
            sessionId,
            endsAtMs: endsAt,
          }),
        ]);
        ongoingNotificationIdRef.current = ongoingId;
        doneNotificationIdRef.current = doneId;
      } catch {
        // Expo web / simulatore: timer UI resta attivo senza notifica.
      }
    },
    [cancel, sessionId],
  );

  useEffect(() => {
    endRestTimerActivities();
    if (Platform.OS !== "web") {
      void ensureRestTimerPermission().catch(() => undefined);
    }

    mountedRestSessionId = sessionId;
    return () => {
      if (mountedRestSessionId === sessionId) {
        mountedRestSessionId = null;
      }
    };
  }, [sessionId]);

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

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const type = notification.request.content.data?.type;
      if (type !== "rest-done") {
        return;
      }

      const notifSessionId = notification.request.content.data?.sessionId;
      if (notifSessionId !== undefined && Number(notifSessionId) !== sessionId) {
        return;
      }

      void dismissOngoingOnly();
      checkExpiry();
    });

    return () => sub.remove();
  }, [checkExpiry, dismissOngoingOnly, sessionId]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (response.actionIdentifier !== REST_SKIP_ACTION_ID) {
          return;
        }

        const notifSessionId = response.notification.request.content.data?.sessionId;
        if (notifSessionId !== undefined && Number(notifSessionId) !== sessionId) {
          return;
        }

        cancel();
      },
    );

    return () => sub.remove();
  }, [cancel, sessionId]);

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
