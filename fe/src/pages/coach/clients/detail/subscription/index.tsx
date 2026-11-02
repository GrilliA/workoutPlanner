import { useRoute } from "wouter";
import { PageHeader } from "@components/pageHeader";
import { isDatabaseId } from "@utils/databaseId";
import { SubscriptionTab } from "./subscriptionTab";
import "../../../style.css";

export default function ClientSubscriptionPage() {
  const [, params] = useRoute("/clients/:id/subscription");
  const athleteId = Number(params?.id);

  if (!isDatabaseId(athleteId)) {
    return (
      <div className="coach-page page-container page-container--wide">
        <PageHeader title="Cliente" />
        <p className="coach-empty">Cliente non trovato</p>
      </div>
    );
  }

  return <SubscriptionTab key={athleteId} athleteId={athleteId} />;
}
