import { requireOptionalNativeModule } from "expo";

type RestTimerNotificationNativeModule = {
  showRestTimerNotification(
    sessionId: number,
    endsAtMs: number,
    title: string,
    body: string,
  ): void;
  dismissRestTimerNotification(): void;
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
