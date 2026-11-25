import { Redirect } from "expo-router";
import { LoadingBlock } from "../../src/components";
import { NutritionPlaceholderScreen, useAppMode } from "../../src/features/nutrition";

export default function MealsRoute() {
  const { isNutritionAvailable, isNutritionKnown } = useAppMode();

  // Link diretto all'avvio: si aspetta la Home prima di decidere se la tab esiste.
  if (!isNutritionKnown) {
    return <LoadingBlock />;
  }

  // Senza piano attivo (coach che lo disattiva, link diretto) la tab non esiste: si torna alla Home.
  if (!isNutritionAvailable) {
    return <Redirect href="/(app)" />;
  }

  return (
    <NutritionPlaceholderScreen
      title="Piano pasti"
      heading="Il piano del tuo coach"
      body="Presto qui troverai tutti i pasti della giornata, in ordine, con le quantità."
    />
  );
}
