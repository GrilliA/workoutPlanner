import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ApiError,
  saveCoachClientMealPlan,
  setCoachClientMealPlanActive,
  useMutation,
  type MealPlan,
  type MealPlanInput,
  type MealPlanTemplate,
  type MealTagLists,
} from "@api";
import { Button } from "@components/button";
import { ConfirmDialog } from "@components/confirmDialog";
import { PageHeader } from "@components/pageHeader";
import { toast } from "@components/toast";
import { useUnsavedChangesGuard } from "@utils/useUnsavedChangesGuard";
import { ClientTabs } from "../../clientTabs";
import { ApplyTemplateDialog } from "../applyTemplateDialog";
import { MealCard } from "../mealCard";
import {
  MAX_MEALS,
  MAX_PLAN_NOTES_LENGTH,
  addMeal,
  applyTemplate,
  draftFromPlan,
  isDraftChanged,
  mealPlanInputFrom,
  moveMeal,
  type MealPlanDraft,
} from "../mappers/mealPlanDraft";
import "./style.css";

const SAVE_ERROR = "Impossibile salvare il piano";
const ACTIVE_ERROR = "Impossibile cambiare lo stato del piano";
const LEGAL_NOTICE =
  "Indicazioni generali per il cliente. Un piano alimentare personalizzato va preparato da un professionista abilitato.";

type MealPlanEditorProps = {
  athleteId: number;
  clientName: string;
  clientEmail?: string;
  /** null before the first save. */
  plan: MealPlan | null;
  tagLists: MealTagLists;
  /** The coach chose "Applica un template" in the empty state. */
  opensWithTemplates: boolean;
  adherence: ReactNode;
  onSaved: (plan: MealPlan) => void;
  onActiveChanged: (plan: MealPlan) => void;
  /** After a 404 or 409 the plan on screen is stale: read it again (contract). */
  onStale: () => void;
  onClientGone: () => void;
};

const quoted = (names: string[]): string => names.map((name) => `"${name}"`).join(" e ");

/** "Template "X" applicato. 1 pasto saltato: il tag "Merenda" è archiviato." */
function appliedTemplateNotice(
  templateName: string,
  skippedCount: number,
  skippedTagNames: string[],
): string {
  const applied = `Template "${templateName}" applicato.`;

  if (skippedCount === 0) {
    return `${applied} Scrivi gli alimenti e salva il piano.`;
  }

  const skipped = skippedCount === 1 ? "1 pasto saltato" : `${skippedCount} pasti saltati`;
  const reason =
    skippedTagNames.length === 1
      ? `il tag ${quoted(skippedTagNames)} è archiviato`
      : `i tag ${quoted(skippedTagNames)} sono archiviati`;

  return `${applied} ${skipped}: ${reason}.`;
}

export function MealPlanEditor({
  athleteId,
  clientName,
  clientEmail,
  plan,
  tagLists,
  opensWithTemplates,
  adherence,
  onSaved,
  onActiveChanged,
  onStale,
  onClientGone,
}: MealPlanEditorProps) {
  const formId = useId();
  const notesId = useId();
  const [savedDraft] = useState(() => draftFromPlan(plan, () => crypto.randomUUID()));
  const [draft, setDraft] = useState<MealPlanDraft>(savedDraft);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(opensWithTemplates);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const liveTags = tagLists.mealTags;
  const liveTagIds = liveTags.map((tag) => tag.id);
  const archivedTags = tagLists.archivedMealTags;
  const isFull = draft.meals.length >= MAX_MEALS;

  const tagNameOf = (tagId: number): string => {
    const knownTag = [...liveTags, ...archivedTags].find((tag) => tag.id === tagId);
    const savedMeal = plan?.meals.find((meal) => meal.tagId === tagId);
    return knownTag?.name ?? savedMeal?.name ?? "Pasto";
  };

  const save = useMutation({
    mutationFn: (input: MealPlanInput) => saveCoachClientMealPlan(athleteId, input),
    fallback: SAVE_ERROR,
    onSuccess: (savedPlan) => {
      toast.success("Piano salvato");
      onSaved(savedPlan);
    },
    onError: (error) => {
      toast.error(ApiError.messageFrom(error, SAVE_ERROR));

      if (error.status === 404 && error.message === "Client not found") {
        onClientGone();
        return;
      }

      // 413 keeps the edits: the coach shortens them and saves again, never the same body.
      if (error.status === 404 || error.status === 409) {
        onStale();
      }
    },
  });

  const switchActive = useMutation({
    mutationFn: (isActive: boolean) => setCoachClientMealPlanActive(athleteId, isActive),
    fallback: ACTIVE_ERROR,
    onSuccess: (switchedPlan) => {
      toast.success(switchedPlan.isActive ? "Piano riattivato" : "Piano disattivato");
      onActiveChanged(switchedPlan);
    },
    onError: (error) => {
      toast.error(ApiError.messageFrom(error, ACTIVE_ERROR));

      if (error.status === 404) {
        onStale();
      }
    },
  });

  const hasUnsavedChanges = isDraftChanged(draft, savedDraft);
  const { isLeaveDialogOpen, leavePage, stayOnPage } = useUnsavedChangesGuard(
    hasUnsavedChanges && !save.isPending,
  );

  const changeDraft = (change: (current: MealPlanDraft) => MealPlanDraft) => {
    setFormError(null);
    setDraft(change);
  };

  const handleApplyTemplate = (template: MealPlanTemplate) => {
    const applied = applyTemplate(draft, template, liveTagIds, () => crypto.randomUUID());
    setDraft(applied.draft);
    setFormError(null);
    setIsTemplateDialogOpen(false);
    setAppliedNotice(
      appliedTemplateNotice(template.name, applied.skippedCount, applied.skippedTagNames),
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (draft.meals.length === 0) {
      setFormError("Aggiungi almeno un pasto prima di salvare.");
      return;
    }

    save.mutate(mealPlanInputFrom(draft));
  };

  const headerActions = (
    <div className="header-actions">
      <Button variant="secondary" onClick={() => setIsTemplateDialogOpen(true)}>
        Applica un template
      </Button>
      <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
        Salva piano
      </Button>
    </div>
  );

  return (
    <div className="meal-plan-editor coach-page page-container page-container--wide">
      <PageHeader title={clientName} subtitle={clientEmail} action={headerActions} />

      <ClientTabs athleteId={athleteId} activeTab="nutrition" />

      {appliedNotice !== null ? (
        <p className="notice notice--warning" role="status">
          {appliedNotice}
        </p>
      ) : null}

      {plan !== null && !plan.isActive ? (
        <p className="notice">Piano disattivato: il cliente non lo vede. Riattivalo quando serve.</p>
      ) : null}

      <div className="layout">
        <form id={formId} className="meals-form" aria-label="Pasti del piano" onSubmit={handleSubmit}>
          {formError !== null ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="meals" data-reorder-list>
            {draft.meals.map((meal, index) => {
              const isTagArchived = !liveTagIds.includes(meal.tagId);
              const name = tagNameOf(meal.tagId);
              const liveOptions = liveTags.map((tag) => ({ value: String(tag.id), label: tag.name }));
              const archivedOption = { value: String(meal.tagId), label: `${name} · archiviato` };
              const tagOptions = isTagArchived ? [...liveOptions, archivedOption] : liveOptions;

              return (
                <MealCard
                  key={meal.key}
                  meal={meal}
                  index={index}
                  count={draft.meals.length}
                  name={name}
                  isTagArchived={isTagArchived}
                  tagOptions={tagOptions}
                  onDraftChange={changeDraft}
                  onMove={(fromIndex, toIndex) =>
                    changeDraft((current) => moveMeal(current, fromIndex, toIndex))
                  }
                />
              );
            })}
          </div>

          <section className="add-meal" aria-labelledby={`${formId}-add`}>
            <div className="add-meal__head">
              <h2 id={`${formId}-add`} className="add-meal__title">
                Aggiungi un pasto
              </h2>
              <Link href="/meal-tags" className="coach-link">
                Gestisci i tag
              </Link>
            </div>
            {isFull ? (
              <p className="limit">Il piano ha già {MAX_MEALS} pasti, il massimo.</p>
            ) : (
              <div className="add-meal__tags">
                {liveTags.map((tag) => (
                  <Button
                    key={tag.id}
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      changeDraft((current) => addMeal(current, tag.id, () => crypto.randomUUID()))
                    }
                  >
                    {`+ ${tag.name}`}
                  </Button>
                ))}
              </div>
            )}
            {liveTags.length === 0 ? (
              <p className="limit">Non hai tag attivi: aggiungine uno in Tag pasti.</p>
            ) : null}
          </section>
        </form>

        <div className="aside">
          <section className="notes-card">
            <label htmlFor={notesId} className="notes-card__label">
              Note per il cliente
            </label>
            <textarea
              id={notesId}
              className="input-base"
              form={formId}
              rows={4}
              maxLength={MAX_PLAN_NOTES_LENGTH}
              value={draft.notes}
              onChange={(event) => {
                const notes = event.target.value;
                changeDraft((current) => ({ ...current, notes }));
              }}
            />
          </section>

          {plan !== null ? (
            <section className="status-card" aria-labelledby={`${formId}-status`}>
              <h2 id={`${formId}-status`} className="status-card__title">
                {plan.isActive ? "Piano attivo" : "Piano disattivato"}
              </h2>
              <p className="status-card__text">
                {plan.isActive
                  ? "Il cliente lo vede nell'app."
                  : "Pasti e registrazioni restano: riattivalo quando serve."}
              </p>
              <Button
                variant="secondary"
                size="sm"
                loading={switchActive.isPending}
                onClick={() => switchActive.mutate(!plan.isActive)}
              >
                {plan.isActive ? "Disattiva piano" : "Riattiva piano"}
              </Button>
            </section>
          ) : null}

          {adherence}

          <p className="notice notice--warning legal">{LEGAL_NOTICE}</p>
        </div>
      </div>

      {isTemplateDialogOpen ? (
        <ApplyTemplateDialog
          clientName={clientName}
          mealCount={draft.meals.length}
          liveTagIds={liveTagIds}
          onApply={handleApplyTemplate}
          onClose={() => setIsTemplateDialogOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        isOpen={isLeaveDialogOpen}
        title="Uscire senza salvare?"
        message="Le modifiche al piano pasti andranno perse."
        confirmLabel="Esci senza salvare"
        cancelLabel="Resta"
        onConfirm={leavePage}
        onCancel={stayOnPage}
      />
    </div>
  );
}
