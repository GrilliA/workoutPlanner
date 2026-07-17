import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { getPlatform, isNative } from "@utils/platform";
import { navigateTo } from "@utils/appNavigation";

export const REST_TIMER_NOTIFICATION_ID = 9001;

const REST_TIMER_CHANNEL_ID = "rest-timer";

const NOTIFICATION_TITLE = "Recupero finito";
const NOTIFICATION_BODY = "Vai con la prossima serie";

let nativeReady = false;
let notificationsGranted = false;

const playWebBeep = (): void => {
  const AudioContextCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.25, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.45);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.45);

  void context.close();
};

const playWebVibrate = (): void => {
  if (getPlatform() === "android") {
    navigator.vibrate?.([200, 100, 200]);
  }
};

export async function initRestTimerNative(): Promise<void> {
  if (!isNative() || nativeReady) {
    return;
  }

  nativeReady = true;

  if (getPlatform() === "android") {
    await LocalNotifications.createChannel({
      id: REST_TIMER_CHANNEL_ID,
      name: "Recupero",
      description: "Avvisi fine recupero tra le serie",
      importance: 4,
      sound: "default",
    });
  }

  const permission = await LocalNotifications.requestPermissions();
  notificationsGranted = permission.display === "granted";

  await LocalNotifications.addListener("localNotificationReceived", (notification) => {
    if (notification.id !== REST_TIMER_NOTIFICATION_ID) {
      return;
    }

    void triggerHaptic();
  });

  await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    if (event.notification.id !== REST_TIMER_NOTIFICATION_ID) {
      return;
    }

    const sessionId = event.notification.extra?.sessionId;

    if (typeof sessionId === "number") {
      navigateTo(`/sessions/${sessionId}`);
    }
  });
}

export function canScheduleNativeNotification(): boolean {
  return isNative() && notificationsGranted;
}

export async function scheduleRestAlert(at: Date, sessionId: number): Promise<void> {
  if (!canScheduleNativeNotification()) {
    return;
  }

  await cancelRestAlert();

  await LocalNotifications.schedule({
    notifications: [
      {
        id: REST_TIMER_NOTIFICATION_ID,
        title: NOTIFICATION_TITLE,
        body: NOTIFICATION_BODY,
        schedule: { at },
        channelId: REST_TIMER_CHANNEL_ID,
        extra: { sessionId },
      },
    ],
  });
}

export async function cancelRestAlert(): Promise<void> {
  if (!isNative()) {
    return;
  }

  await LocalNotifications.cancel({
    notifications: [{ id: REST_TIMER_NOTIFICATION_ID }],
  });
}

export async function triggerHaptic(): Promise<void> {
  if (!isNative()) {
    return;
  }

  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    // Haptics unavailable on some devices/simulators.
  }
}

export async function playRestDoneAlert(_sessionId: number, inForeground: boolean): Promise<void> {
  await cancelRestAlert();

  if (isNative()) {
    if (inForeground) {
      await triggerHaptic();
    }
    return;
  }

  playWebBeep();
  playWebVibrate();
}
