import { requireOptionalNativeModule } from "expo";

type RestTimerNotificationNativeModule = {
  showRestTimerNotification(
    sessionId: number,
    endsAtMs: number,
    title: string,
    body: string,
  ): void;
  dismissRestTimerNotification(): void;
  scheduleRestDoneAlarm(
    sessionId: number,
    endsAtMs: number,
    title: string,
    body: string,
  ): boolean;
  setRestTimerSessionMounted(mounted: boolean): void;
  promptExactRestAlarmOnce(): void;
};

const nativeModule =
  requireOptionalNativeModule<RestTimerNotificationNativeModule>(
    "RestTimerNotification",
  );

export function showRestTimerNotification(input: {
  sessionId: number;
  endsAtMs: number;
  title: string;
  body: string;
}): void {
  if (!nativeModule) {
    return;
  }

  try {
    nativeModule.showRestTimerNotification(
      input.sessionId,
      input.endsAtMs,
      input.title,
      input.body,
    );
  } catch {
    // Modulo nativo non disponibile (es. Expo Go).
  }
}

export function dismissRestTimerNotification(): void {
  if (!nativeModule) {
    return;
  }

  try {
    nativeModule.dismissRestTimerNotification();
  } catch {
    // Modulo nativo non disponibile (es. Expo Go).
  }
}

export function scheduleRestDoneAlarm(input: {
  sessionId: number;
  endsAtMs: number;
  title: string;
  body: string;
}): boolean {
  if (!nativeModule) {
    return false;
  }

  try {
    return nativeModule.scheduleRestDoneAlarm(
      input.sessionId,
      input.endsAtMs,
      input.title,
      input.body,
    ) === true;
  } catch {
    return false;
  }
}

export function setRestTimerSessionMounted(mounted: boolean): void {
  if (!nativeModule) {
    return;
  }

  try {
    nativeModule.setRestTimerSessionMounted(mounted);
  } catch {
    // Modulo nativo non disponibile (es. Expo Go).
  }
}

export function promptExactRestAlarmOnce(): void {
  if (!nativeModule) {
    return;
  }

  try {
    nativeModule.promptExactRestAlarmOnce();
  } catch {
    // Modulo nativo non disponibile (es. Expo Go).
  }
}
