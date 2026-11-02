import { router, useLocalSearchParams } from "expo-router";
import { useSyncExternalStore } from "react";
import { CelebrationView } from "../../src/features/session/CelebrationView";
import {
  getOfflineSession,
  subscribeOfflineSession,
} from "../../src/features/session/offlineSessionStore";

function parseNonNegativeNumber(raw: string | undefined, fallback = 0): number {
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

/** Fine sessione: celebration + stats, poi Home. */
export default function SessionCompleteScreen() {
  const params = useLocalSearchParams<{
    workoutName?: string;
    volumeKg?: string;
    durationMin?: string;
    setCount?: string;
  }>();

  const offlineSession = useSyncExternalStore(
    subscribeOfflineSession,
    getOfflineSession,
  );
  // Only after a failed try: a close sent at once would flash the line.
  const closeIsWaiting = offlineSession?.syncStatus === "waiting";

  const workoutName =
    typeof params.workoutName === "string" && params.workoutName.trim() !== ""
      ? params.workoutName
      : "Allenamento";

  // Niente Screen: il fondo arancio arriva fino al bordo, safe area inclusa.
  return (
    <CelebrationView
      workoutName={workoutName}
      volumeKg={parseNonNegativeNumber(params.volumeKg)}
      durationMin={Math.round(parseNonNegativeNumber(params.durationMin))}
      setCount={Math.round(parseNonNegativeNumber(params.setCount))}
      syncNote={closeIsWaiting ? "Lo salviamo appena torna la rete" : undefined}
      onDone={() => {
        router.replace("/(app)");
      }}
    />
  );
}
