import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

const REST_NOTIFICATION_TYPES = new Set(["rest-done"]);

const routeFromResponse = (
  response: Notifications.NotificationResponse | null,
): void => {
  if (!response) {
    return;
  }

  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return;
  }

  const data = response.notification.request.content.data;
  if (!REST_NOTIFICATION_TYPES.has(String(data?.type))) {
    return;
  }

  const sessionId = Number(data?.sessionId);
  if (Number.isFinite(sessionId)) {
    router.navigate(`/session/${sessionId}`);
  }
};

/**
 * Tap su una notifica del timer di recupero → apre la sessione.
 * Gestisce sia il tap a caldo sia l'apertura a freddo dell'app.
 */
export function useRestNotificationRouting(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || Platform.OS === "web") {
      return;
    }

    const sub = Notifications.addNotificationResponseReceivedListener(
      routeFromResponse,
    );

    void Notifications.getLastNotificationResponseAsync()
      .then(routeFromResponse)
      .catch(() => undefined);

    return () => sub.remove();
  }, [enabled]);
}
