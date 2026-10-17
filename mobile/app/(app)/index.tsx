import { HomeScreen } from "../../src/features/home";
import { OfflineSessionBanner } from "../../src/features/session/OfflineSessionBanner";

export default function HomeRoute() {
  return <HomeScreen offlineSessionBanner={<OfflineSessionBanner />} />;
}
