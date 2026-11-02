import { useEffect } from "react";
import { AppState } from "react-native";
import { resumeOfflineSession, sendCloseIfPending } from "./offlineSessionStore";

/**
 * Send a session closed offline: at app start, after sign-in and every time
 * the app comes back to the foreground. Pass null when nobody is signed in.
 */
export function useOfflineSessionSync(userId: number | null): void {
  useEffect(() => {
    if (userId === null) {
      return;
    }

    void resumeOfflineSession(userId);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void sendCloseIfPending();
      }
    });

    return () => subscription.remove();
  }, [userId]);
}
