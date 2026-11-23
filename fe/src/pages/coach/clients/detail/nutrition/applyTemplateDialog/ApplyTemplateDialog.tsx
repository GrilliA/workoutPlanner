import { useId, useLayoutEffect, useRef, useState, type FormEvent, type SyntheticEvent } from "react";
import { Link } from "wouter";
import { ApiError, getCoachMealPlanTemplates, useQuery, type MealPlanTemplate } from "@api";
import { Button, ButtonIcon } from "@components/button";
import { Skeleton } from "@components/skeleton";
import { toast } from "@components/toast";
import { cx } from "@utils/cx";
import "./style.css";

const TEMPLATES_ERROR = "Impossibile caricare i template";

type ApplyTemplateDialogProps = {
  clientName: string;
  /** Meals already in the editor: applying replaces them. */
  mealCount: number;
  liveTagIds: number[];
  onApply: (template: MealPlanTemplate) => void;
  onClose: () => void;
};

const skippedNote = (names: string[]): string => {
  const quoted = names.map((name) => `"${name}"`).join(", ");
  return names.length === 1
    ? `Il pasto ${quoted} verrà saltato: il tag è archiviato.`
    : `I pasti ${quoted} verranno saltati: i tag sono archiviati.`;
};

/** Mounted only while open: every opening reads the templates again. */
export function ApplyTemplateDialog({
  clientName,
  mealCount,
  liveTagIds,
  onApply,
  onClose,
}: ApplyTemplateDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  const [chosenId, setChosenId] = useState<number | null>(null);

  // showModal() puts the dialog in the top layer, makes the page inert and handles Esc;
  // closing it on unmount gives the focus back to the button that opened it.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;

    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog !== null && dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const templates = useQuery({
    queryFn: async ({ signal }) => {
      const response = await getCoachMealPlanTemplates({ signal });
      return response.mealPlanTemplates;
    },
    fallback: TEMPLATES_ERROR,
    throwOnError: false,
    onError: (error) => toast.error(ApiError.messageFrom(error, TEMPLATES_ERROR)),
  });

  const list = templates.data ?? [];
  const chosen = list.find((template) => template.id === chosenId) ?? list[0] ?? null;
  const hasFailed = !templates.isPending && templates.data === undefined;
  const isEmpty = templates.data !== undefined && list.length === 0;
  const isReplacing = mealCount > 0;

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (chosen !== null) {
      onApply(chosen);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="apply-template-dialog"
      aria-labelledby={titleId}
      aria-describedby={subtitleId}
      onCancel={handleCancel}
    >
      <form className="body" onSubmit={handleSubmit}>
        <div className="header">
          <div>
            <h2 id={titleId} className="title">
              Applica un template
            </h2>
            <p id={subtitleId} className="subtitle">
              Mette nel piano i pasti in ordine. Gli alimenti li scrivi tu per {clientName}.
            </p>
          </div>
          <ButtonIcon variant="ghost" className="close" aria-label="Chiudi" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </ButtonIcon>
        </div>

        {templates.isPending ? (
          <div className="loading" role="status">
            <span className="sr-only">Caricamento…</span>
            <Skeleton height="5.5rem" />
            <Skeleton height="5.5rem" />
          </div>
        ) : null}

        {hasFailed ? <p className="empty">Template non disponibili. Chiudi e riprova.</p> : null}

        {isEmpty ? (
          <p className="empty">Non hai ancora template. Preparane uno in Template pasti.</p>
        ) : null}

        {list.length > 0 ? (
          <fieldset className="templates">
            <legend className="sr-only">Template</legend>
            {list.map((template) => {
              const isChosen = template.id === chosen?.id;
              const skippedNames = template.meals
                .filter((meal) => !liveTagIds.includes(meal.tagId))
                .map((meal) => meal.name)
                .filter((name, index, names) => names.indexOf(name) === index);

              return (
                <label key={template.id} className={cx("template", isChosen && "template--chosen")}>
                  <input
                    type="radio"
                    name="template"
                    checked={isChosen}
                    onChange={() => setChosenId(template.id)}
                  />
                  <span className="template__body">
                    <span className="template__name">{template.name}</span>
                    <span className="sequence">
                      {template.meals.map((meal, index) => {
                        const isArchived = !liveTagIds.includes(meal.tagId);

                        return (
                          <span
                            // Template meals have no id: the position is their identity.
                            key={index}
                            className={cx("chip", isArchived && "chip--archived")}
                          >
                            {isArchived ? `${meal.name} · archiviato` : meal.name}
                            {meal.timeOfDay !== null && !isArchived ? (
                              <span className="chip__time">{meal.timeOfDay}</span>
                            ) : null}
                          </span>
                        );
                      })}
                    </span>
                    {skippedNames.length > 0 ? (
                      <span className="template__skipped">{skippedNote(skippedNames)}</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </fieldset>
        ) : null}

        {isReplacing && chosen !== null ? (
          <p className="replace-warning">
            {mealCount === 1
              ? "Il piano ha già 1 pasto: viene sostituito e gli alimenti scritti si perdono."
              : `Il piano ha già ${mealCount} pasti: vengono sostituiti e gli alimenti scritti si perdono.`}
          </p>
        ) : null}

        <div className="footer">
          <Link href="/meal-templates" className="coach-link">
            Vai a Template pasti
          </Link>
          <div className="footer__buttons">
            <Button variant="secondary" onClick={onClose} autoFocus>
              Annulla
            </Button>
            <Button variant="primary" type="submit" disabled={chosen === null}>
              {isReplacing ? "Applica e sostituisci" : "Applica"}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
