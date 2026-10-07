import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const REST_TIMER_CHANNEL_ID = "rest-timer";

export type RestNotificationKind = "rest-done";

export const formatRestClock = (endsAtMs: number): string => {
  const date = new Date(endsAtMs);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

let channelReady: Promise<void> | null = null;

export const ensureRestTimerChannel = (): Promise<void> => {
  if (Platform.OS !== "android") {
    return Promise.resolve();
  }

  if (!channelReady) {
    channelReady = Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL_ID, {
      name: "Recupero",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 120, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      lightColor: "#bfdbf7",
    }).then(() => undefined);
  }

  return channelReady;
};

let permissionReady: Promise<boolean> | null = null;

export const ensureRestTimerPermission = (): Promise<boolean> => {
  if (!permissionReady) {
    permissionReady = Notifications.requestPermissionsAsync().then(
      (permission) => permission.granted,
    );
  }

  return permissionReady;
};

export const scheduleRestDoneNotification = async (input: {
  sessionId: number;
  endsAtMs: number;
}): Promise<string | null> => {
  await ensureRestTimerChannel();

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Recupero finito",
      body: "Vai con la prossima serie",
      interruptionLevel: "timeSensitive",
      data: {
        sessionId: input.sessionId,
        type: "rest-done" satisfies RestNotificationKind,
      },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      ...(Platform.OS === "android" ? { channelId: REST_TIMER_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(input.endsAtMs),
    },
  });
};

export const cancelScheduledRestDone = async (
  sessionId: number,
): Promise<void> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter(
        (notification) =>
          notification.content.data?.type === "rest-done" &&
          Number(notification.content.data?.sessionId) === sessionId,
      )
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(
          () => undefined,
        ),
      ),
  );
};

export const clearRestNotification = async (id: string | null): Promise<void> => {
  if (!id) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or cancelled.
  }

  try {
    await Notifications.dismissNotificationAsync(id);
  } catch {
    // Already dismissed or not presented.
  }
};
