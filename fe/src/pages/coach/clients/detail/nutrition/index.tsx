import { useRoute } from "wouter";
import { PageHeader } from "@components/pageHeader";
import { NutritionTab } from "./nutritionTab";
import "../../../style.css";

// Postgres `integer`: a larger id is not a client, and the API would refuse it.
const MAX_DATABASE_ID = 2_147_483_647;

export default function ClientNutritionPage() {
  const [, params] = useRoute("/clients/:id/nutrition");
  const athleteId = Number(params?.id);
  const isIdValid =
    Number.isInteger(athleteId) && athleteId >= 1 && athleteId <= MAX_DATABASE_ID;

  if (!isIdValid) {
    return (
      <div className="coach-page page-container page-container--wide">
        <PageHeader title="Cliente" />
        <p className="coach-empty">Cliente non trovato</p>
      </div>
    );
  }

  return <NutritionTab key={athleteId} athleteId={athleteId} />;
}
