import { HomeScreen } from "../../src/features/home";
import { formatLongDate } from "../../src/features/home/mappers/homeLabels";
import { NutritionPlaceholderScreen, useAppMode } from "../../src/features/nutrition";
import { OfflineSessionBanner } from "../../src/features/session/OfflineSessionBanner";
import { toRomeDateKey } from "../../src/utils/romeCalendar";

export default function HomeRoute() {
  const { mode } = useAppMode();

  if (mode === "nutrition") {
    return (
      <NutritionPlaceholderScreen
        showModeSwitch
        overline={formatLongDate(toRomeDateKey(new Date()))}
        title="Oggi a tavola"
        heading="Il tuo piano pasti è attivo"
        body="Presto qui vedrai il pasto di adesso e potrai segnarlo come fatto."
      />
    );
  }

  return <HomeScreen offlineSessionBanner={<OfflineSessionBanner />} />;
}
