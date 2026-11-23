import { useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@components/pageHeader";
import { Skeleton } from "@components/skeleton";
import { todayInRome } from "@utils/romeCalendar";
import { useClientDetail } from "../../api/useClientDetail";
import { ClientTabs } from "../../clientTabs";
import { useClientMealPlan } from "../api/useClientMealPlan";
import { AdherenceCard } from "../adherenceCard";
import { MealPlanEditor } from "../mealPlanEditor";
import { NutritionEmpty } from "../nutritionEmpty";
import "./style.css";

type NutritionTabProps = {
  athleteId: number;
};

/** How the editor opens when the client has no plan yet. */
type PlanStart = "none" | "blank" | "template";

export function NutritionTab({ athleteId }: NutritionTabProps) {
  const today = todayInRome();
  const [, setLocation] = useLocation();
  const { detail: clientDetail, loading: isClientLoading } = useClientDetail(athleteId);
  const { pageData, logs, isLogsPending, editorVersion, reload, showSavedPlan } = useClientMealPlan(
    athleteId,
    today,
  );
  const [planStart, setPlanStart] = useState<PlanStart>("none");

  const client = clientDetail?.client ?? null;
  const clientName = client?.name ?? client?.email ?? "Cliente";
  const isLoading = isClientLoading || pageData === undefined;
  const isNotFound = !isLoading && (client === null || pageData?.isClientFound === false);
  const mealPlan = pageData?.mealPlan ?? null;
  const tagLists = pageData?.tagLists ?? null;
  const isEditorShown = !isLoading && !isNotFound && tagLists !== null;
  const hasNoPlan = isEditorShown && mealPlan === null && planStart === "none";

  if (isEditorShown && !hasNoPlan) {
    return (
      <MealPlanEditor
        key={editorVersion}
        athleteId={athleteId}
        clientName={clientName}
        clientEmail={client?.email}
        plan={mealPlan}
        tagLists={tagLists}
        opensWithTemplates={mealPlan === null && planStart === "template"}
        // After a reload (404 or 409) or from the empty state, the old focus is gone.
        focusTitleOnMount={editorVersion > 0 || planStart === "blank"}
        adherence={<AdherenceCard days={logs} isPending={isLogsPending} today={today} />}
        onSaved={showSavedPlan}
        onActiveChanged={showSavedPlan}
        onStale={reload}
        onClientGone={() => setLocation("/clients")}
      />
    );
  }

  return (
    <div className="nutrition-tab coach-page page-container page-container--wide">
      <PageHeader title={clientName} subtitle={client?.email} />

      <ClientTabs athleteId={athleteId} activeTab="nutrition" />

      {isLoading ? (
        <div className="loading" role="status">
          <span className="sr-only">Caricamento…</span>
          <Skeleton height="14rem" />
          <Skeleton height="9rem" />
        </div>
      ) : null}

      {isNotFound ? <p className="coach-empty">Cliente non trovato</p> : null}

      {hasNoPlan ? (
        <NutritionEmpty
          clientName={clientName}
          onCreate={() => setPlanStart("blank")}
          onApplyTemplate={() => setPlanStart("template")}
        />
      ) : null}
    </div>
  );
}
