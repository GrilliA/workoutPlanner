import { NutritionPlaceholderScreen, useAppMode } from "../../src/features/nutrition";
import { ProgressScreen } from "../../src/features/stats";

export default function StatsScreen() {
  const { mode } = useAppMode();

  if (mode === "nutrition") {
    return (
      <NutritionPlaceholderScreen
        title="Progressi"
        heading="Come segui il piano"
        body="Presto qui vedrai, giorno per giorno, i pasti fatti e quelli cambiati."
      />
    );
  }

  return <ProgressScreen />;
}
