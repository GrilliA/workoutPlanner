import { router, useLocalSearchParams } from "expo-router";
import { CelebrationView } from "../../src/features/session/CelebrationView";
import { Screen } from "../../src/components";

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
  }>();

  const workoutName =
    typeof params.workoutName === "string" && params.workoutName.trim() !== ""
      ? params.workoutName
      : "Allenamento";

  return (
    <Screen padded={false}>
      <CelebrationView
        workoutName={workoutName}
        volumeKg={parseNonNegativeNumber(params.volumeKg)}
        durationMin={Math.round(parseNonNegativeNumber(params.durationMin))}
        onDone={() => {
          router.replace("/(app)");
        }}
      />
    </Screen>
  );
}
