import { useRef, useState } from "react";
import {
  ApiError,
  createCoachMealPlanTemplate,
  deleteCoachMealPlanTemplate,
  getCoachMealPlanTemplates,
  getCoachMealTags,
  replaceCoachMealPlanTemplate,
  useMutation,
  useQuery,
  type MealPlanTemplate,
  type MealPlanTemplateInput,
} from "@api";
import { ConfirmDialog } from "@components/confirmDialog";
import { PageHeader } from "@components/pageHeader";
import { Skeleton } from "@components/skeleton";
import { toast } from "@components/toast";
import { tagNameOf } from "@pages/coach/mealtags/tagLabels";
import { cx } from "@utils/cx";
import { useUnsavedChangesGuard } from "@utils/useUnsavedChangesGuard";
import {
  MAX_TEMPLATES,
  isTemplateDraftChanged,
  templateDraftFrom,
  templateInputFrom,
  type TemplateDraft,
} from "../mappers/templateDraft";
import { TemplateEditor } from "../templateEditor";
import "../../style.css";
import "./style.css";

const SAVE_ERROR = "Impossibile salvare il template";
const DELETE_ERROR = "Impossibile eliminare il template";

/** The template being edited: its id ("new" before the first save) and its two drafts. */
type Editing = {
  templateId: number | "new";
  saved: TemplateDraft;
  current: TemplateDraft;
};

const mealCountLabel = (count: number): string => (count === 1 ? "1 pasto" : `${count} pasti`);

export function MealTemplatesPage() {
  const [reloadCount, setReloadCount] = useState(0);
  // undefined: the first template of the list (or a new one when there is none).
  const [selectedId, setSelectedId] = useState<number | "new" | undefined>(undefined);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [pendingSelection, setPendingSelection] = useState<number | "new" | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // The editor starts over when another template is chosen, not when a new one is first
  // saved: its id changes then, but the coach is still in the same form with the focus on it.
  const [editorSession, setEditorSession] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const library = useQuery({
    queryKey: [reloadCount],
    queryFn: async ({ signal }) => {
      const [templatesResponse, tagLists] = await Promise.all([
        getCoachMealPlanTemplates({ signal }),
        getCoachMealTags({ signal }),
      ]);
      return { templates: templatesResponse.mealPlanTemplates, tagLists };
    },
    fallback: "Impossibile caricare i template",
    keepPreviousData: true,
  });

  const templates = library.data?.templates ?? [];
  const liveTags = library.data?.tagLists.mealTags ?? [];
  const archivedTags = library.data?.tagLists.archivedMealTags ?? [];
  const effectiveId = selectedId ?? templates[0]?.id ?? "new";
  const selectedTemplate = templates.find((template) => template.id === effectiveId) ?? null;
  const isEditingSelected = editing !== null && editing.templateId === effectiveId;
  const savedDraft = isEditingSelected ? editing.saved : templateDraftFrom(selectedTemplate);
  const draft = isEditingSelected ? editing.current : savedDraft;
  const hasUnsavedChanges = isTemplateDraftChanged(draft, savedDraft);
  const isNew = effectiveId === "new";

  const knownTags = [...liveTags, ...archivedTags];
  const savedMeals = selectedTemplate?.meals ?? [];

  const startOver = () => {
    setEditorSession((session) => session + 1);
    setSelectedId(undefined);
    setEditing(null);
    setReloadCount((count) => count + 1);
  };

  const reportWriteError = (error: ApiError, fallback: string) => {
    toast.error(ApiError.messageFrom(error, fallback));

    // Another tab deleted the template or archived a tag: show what is saved now.
    if (error.status === 404) {
      startOver();
    }
  };

  const save = useMutation({
    mutationFn: (input: MealPlanTemplateInput) =>
      effectiveId === "new"
        ? createCoachMealPlanTemplate(input)
        : replaceCoachMealPlanTemplate(effectiveId, input),
    fallback: SAVE_ERROR,
    onSuccess: (savedTemplate: MealPlanTemplate) => {
      toast.success("Template salvato");
      const savedTemplateDraft = templateDraftFrom(savedTemplate);
      setSelectedId(savedTemplate.id);
      setEditing({ templateId: savedTemplate.id, saved: savedTemplateDraft, current: savedTemplateDraft });
      setReloadCount((count) => count + 1);
    },
    onError: (error) => reportWriteError(error, SAVE_ERROR),
  });

  const remove = useMutation({
    mutationFn: (templateId: number) => deleteCoachMealPlanTemplate(templateId),
    fallback: DELETE_ERROR,
    onSuccess: () => {
      toast.success("Template eliminato");
      // The editor of the deleted template goes away with its button: the title keeps the focus.
      titleRef.current?.focus();
      startOver();
    },
    onError: (error) => reportWriteError(error, DELETE_ERROR),
  });

  const { isLeaveDialogOpen, leavePage, stayOnPage } = useUnsavedChangesGuard(
    hasUnsavedChanges && !save.isPending,
  );

  const changeDraft = (change: (current: TemplateDraft) => TemplateDraft) => {
    setFormError(null);
    setEditing({ templateId: effectiveId, saved: savedDraft, current: change(draft) });
  };

  const select = (templateId: number | "new") => {
    setEditorSession((session) => session + 1);
    setFormError(null);
    setEditing(null);
    setSelectedId(templateId);
  };

  const askToSelect = (templateId: number | "new") => {
    if (templateId === effectiveId) {
      return;
    }

    if (hasUnsavedChanges) {
      setPendingSelection(templateId);
      return;
    }

    select(templateId);
  };

  const confirmSelection = () => {
    if (pendingSelection !== null) {
      select(pendingSelection);
    }
    setPendingSelection(null);
  };

  const handleSave = () => {
    if (draft.meals.length === 0) {
      setFormError("Aggiungi almeno un pasto prima di salvare.");
      return;
    }

    save.mutate(templateInputFrom(draft));
  };

  const confirmDelete = () => {
    setIsDeleteOpen(false);

    if (effectiveId !== "new") {
      remove.mutate(effectiveId);
    }
  };

  const isFull = templates.length >= MAX_TEMPLATES;

  return (
    <div className="meal-templates-page coach-page page-container page-container--wide">
      <PageHeader
        title="Template pasti"
        subtitle="Giornate tipo da applicare al piano di un cliente."
        titleRef={titleRef}
      />

      {library.data === undefined ? (
        <div className="loading" role="status">
          <span className="sr-only">Caricamento…</span>
          <Skeleton height="16rem" />
          <Skeleton height="22rem" />
        </div>
      ) : (
        <div className="layout">
          <section className="list-card" aria-labelledby="meal-templates-list-title">
            <div className="list-card__head">
              <h2 id="meal-templates-list-title" className="list-card__title">
                Template
              </h2>
              <span className="count">
                {templates.length} di {MAX_TEMPLATES}
              </span>
            </div>
            {templates.length === 0 ? (
              <p className="empty">Ancora nessun template: prepara la prima giornata tipo.</p>
            ) : (
              <ul className="templates">
                {templates.map((template) => {
                  const isSelected = template.id === effectiveId;

                  return (
                    <li key={template.id}>
                      <button
                        type="button"
                        className={cx("template", isSelected && "template--selected")}
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => askToSelect(template.id)}
                      >
                        <span className="template__name">{template.name}</span>
                        <span className="template__meta">{mealCountLabel(template.meals.length)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              type="button"
              className={cx("new-template", isNew && "new-template--selected")}
              aria-current={isNew ? "true" : undefined}
              disabled={isFull && !isNew}
              onClick={() => askToSelect("new")}
            >
              + Nuovo template
            </button>
            {isFull ? (
              <p className="full">Hai {MAX_TEMPLATES} template, il massimo: eliminane uno per crearne un altro.</p>
            ) : null}
          </section>

          <section className="editor-card" aria-label="Modifica template">
            <TemplateEditor
              key={editorSession}
              draft={draft}
              isNew={isNew}
              liveTags={liveTags}
              tagNameOf={(tagId) => tagNameOf(tagId, knownTags, savedMeals)}
              formError={formError}
              isSaving={save.isPending}
              onDraftChange={changeDraft}
              onSave={handleSave}
              onDelete={() => setIsDeleteOpen(true)}
            />
          </section>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title={`Eliminare "${savedDraft.name}"?`}
        message="I piani dei clienti creati con questo template restano come sono."
        confirmLabel="Elimina"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />

      <ConfirmDialog
        isOpen={pendingSelection !== null}
        title="Cambiare template senza salvare?"
        message="Le modifiche a questo template andranno perse."
        confirmLabel="Cambia senza salvare"
        cancelLabel="Resta"
        onConfirm={confirmSelection}
        onCancel={() => setPendingSelection(null)}
      />

      <ConfirmDialog
        isOpen={isLeaveDialogOpen}
        title="Uscire senza salvare?"
        message="Le modifiche al template andranno perse."
        confirmLabel="Esci senza salvare"
        cancelLabel="Resta"
        onConfirm={leavePage}
        onCancel={stayOnPage}
      />
    </div>
  );
}
