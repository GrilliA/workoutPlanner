import { useId, useRef, useState, type FormEvent } from "react";
import type { ListedMealTag } from "@api";
import { Button } from "@components/button";
import { ReorderHandle } from "@pages/coach/reorderHandle";
import { tagNameFieldId } from "../tagLabels";
import { MAX_TAG_NAME_LENGTH, renameNote, tagUsage } from "../usage";
import "./style.css";

type MealTagRowProps = {
  tag: ListedMealTag;
  index: number;
  count: number;
  isRenaming: boolean;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRename: (name: string) => void;
  onArchive: () => void;
};

/** One live tag: renamed in place, moved with the handle, archived with a confirmation. */
export function MealTagRow({
  tag,
  index,
  count,
  isRenaming,
  onMove,
  onRename,
  onArchive,
}: MealTagRowProps) {
  const noteId = useId();
  const errorId = useId();
  const nameFieldRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(tag.name);
  // The coach asked to rename to an empty name: told in words, until the name changes.
  const [hasNameError, setHasNameError] = useState(false);
  const trimmedName = name.trim();
  const isChanged = trimmedName !== tag.name;
  const canRename = isChanged && trimmedName !== "";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (trimmedName === "") {
      setHasNameError(true);
    } else if (canRename) {
      setName(trimmedName);
      onRename(trimmedName);
    }

    // The buttons next to the field go away once the name is saved, and the Rinomina one
    // is disabled while it saves: the focus stays on the field, also on the empty-name error.
    nameFieldRef.current?.focus();
  };

  const handleCancel = () => {
    setName(tag.name);
    setHasNameError(false);
    nameFieldRef.current?.focus();
  };

  const describedBy = [isChanged ? noteId : null, hasNameError ? errorId : null]
    .filter((id) => id !== null)
    .join(" ");

  return (
    <li className="meal-tag-row" data-reorder-item data-changed={isChanged || undefined}>
      <div className="line">
        <ReorderHandle label={tag.name} index={index} count={count} onMove={onMove} />
        <form className="rename" noValidate onSubmit={handleSubmit}>
          <input
            ref={nameFieldRef}
            id={tagNameFieldId(tag.id)}
            className="input-base name"
            aria-label={`Nome del tag ${tag.name}`}
            aria-describedby={describedBy === "" ? undefined : describedBy}
            aria-invalid={hasNameError ? "true" : undefined}
            required
            maxLength={MAX_TAG_NAME_LENGTH}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setHasNameError(false);
            }}
          />
          {isChanged ? (
            <span className="rename-actions">
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                Annulla
              </Button>
              <Button variant="ink" size="sm" type="submit" loading={isRenaming}>
                Rinomina
              </Button>
            </span>
          ) : null}
          {hasNameError ? (
            <p id={errorId} className="input-error name-error">
              Scrivi un nome per il tag.
            </p>
          ) : null}
        </form>
        {isChanged ? null : (
          <>
            <span className="usage">{tagUsage(tag.planCount, tag.templateCount)}</span>
            <Button variant="secondary" size="sm" className="archive" onClick={onArchive}>
              Archivia
            </Button>
          </>
        )}
      </div>
      {isChanged ? (
        <p id={noteId} className="note">
          {renameNote(tag.planCount, tag.templateCount)}
        </p>
      ) : null}
    </li>
  );
}
