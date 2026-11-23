import { useId, type FormEvent } from "react";
import type { ListedMealTag } from "@api";
import { Button, ButtonIcon } from "@components/button";
import { Input } from "@components/input";
import { Select } from "@components/select";
import { ReorderHandle } from "@pages/coach/reorderHandle";
import { tagOptionsFor } from "@pages/coach/mealtags/tagLabels";
import { cx } from "@utils/cx";
import {
  MAX_TEMPLATE_MEALS,
  MAX_TEMPLATE_NAME_LENGTH,
  addTemplateMeal,
  changeTemplateMeal,
  moveTemplateMeal,
  removeTemplateMeal,
  type TemplateDraft,
} from "../mappers/templateDraft";
import "./style.css";

type TemplateEditorProps = {
  draft: TemplateDraft;
  isNew: boolean;
  liveTags: ListedMealTag[];
  tagNameOf: (tagId: number) => string;
  formError: string | null;
  isSaving: boolean;
  onDraftChange: (change: (draft: TemplateDraft) => TemplateDraft) => void;
  onSave: () => void;
  onDelete: () => void;
};

export function TemplateEditor({
  draft,
  isNew,
  liveTags,
  tagNameOf,
  formError,
  isSaving,
  onDraftChange,
  onSave,
  onDelete,
}: TemplateEditorProps) {
  const titleId = useId();
  const liveTagIds = liveTags.map((tag) => tag.id);
  const isFull = draft.meals.length >= MAX_TEMPLATE_MEALS;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };

  return (
    <form className="template-editor" aria-labelledby={titleId} onSubmit={handleSubmit}>
      <h2 id={titleId} className="sr-only">
        {isNew ? "Nuovo template" : `Modifica ${draft.name}`}
      </h2>
      <Input
        label="Nome del template"
        className="name"
        required
        maxLength={MAX_TEMPLATE_NAME_LENGTH}
        placeholder="Es. Giornata standard"
        value={draft.name}
        onChange={(event) => {
          const name = event.target.value;
          onDraftChange((current) => ({ ...current, name }));
        }}
      />
      <p className="intro">
        Solo i pasti in ordine, con l&apos;orario se vuoi. Gli alimenti li scrivi nel piano di ogni
        cliente.
      </p>

      {formError !== null ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      {draft.meals.length > 0 ? (
        <ol className="meals" data-reorder-list>
          {draft.meals.map((meal, index) => {
            const name = tagNameOf(meal.tagId);
            const isArchived = !liveTagIds.includes(meal.tagId);
            const noteId = `${titleId}-archived-${index}`;

            return (
              <li
                key={meal.key}
                className={cx("meal-row", isArchived && "meal-row--archived")}
                data-reorder-item
              >
                <ReorderHandle
                  label={name}
                  index={index}
                  count={draft.meals.length}
                  onMove={(fromIndex, toIndex) =>
                    onDraftChange((current) => moveTemplateMeal(current, fromIndex, toIndex))
                  }
                />
                <Select
                  className="tag-select"
                  aria-label={`Tag del pasto ${index + 1}`}
                  aria-describedby={isArchived ? noteId : undefined}
                  value={String(meal.tagId)}
                  options={tagOptionsFor(liveTags, meal.tagId, name)}
                  onChange={(value) =>
                    onDraftChange((current) =>
                      changeTemplateMeal(current, meal.key, { tagId: Number(value) }),
                    )
                  }
                />
                <input
                  className="input-base time"
                  type="time"
                  aria-label={`Ora di ${name}`}
                  value={meal.timeOfDay}
                  onChange={(event) => {
                    const timeOfDay = event.target.value;
                    onDraftChange((current) => changeTemplateMeal(current, meal.key, { timeOfDay }));
                  }}
                />
                <ButtonIcon
                  variant="ghost"
                  className="remove"
                  aria-label={`Togli ${name}`}
                  onClick={() => onDraftChange((current) => removeTemplateMeal(current, meal.key))}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </ButtonIcon>
                {isArchived ? (
                  <p id={noteId} className="archived-note">
                    Tag archiviato: resta qui, ma viene saltato quando applichi il template. Cambia
                    tag o togli il pasto.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="no-meals">Nessun pasto. Aggiungi i pasti della giornata con i tag qui sotto.</p>
      )}

      <div className="add-meal">
        <span className="add-meal__label">Aggiungi pasto</span>
        {isFull ? (
          <span className="limit">Il template ha già {MAX_TEMPLATE_MEALS} pasti, il massimo.</span>
        ) : (
          liveTags.map((tag) => (
            <Button
              key={tag.id}
              variant="secondary"
              size="sm"
              onClick={() =>
                onDraftChange((current) => addTemplateMeal(current, tag.id, crypto.randomUUID()))
              }
            >
              {`+ ${tag.name}`}
            </Button>
          ))
        )}
      </div>

      <div className="footer">
        {isNew ? (
          <span />
        ) : (
          <Button variant="secondary" className="delete" onClick={onDelete}>
            Elimina template
          </Button>
        )}
        <Button variant="primary" type="submit" loading={isSaving}>
          Salva template
        </Button>
      </div>
    </form>
  );
}
