import { useId, useState } from "react";
import { Button, ButtonIcon } from "@components/button";
import { Select, type SelectOption } from "@components/select";
import { ReorderHandle } from "@pages/coach/reorderHandle";
import { cx } from "@utils/cx";
import {
  MAX_FOOD_LENGTH,
  MAX_ITEMS_PER_MEAL,
  MAX_QUANTITY_LENGTH,
  addItem,
  changeItem,
  changeMealTag,
  changeMealTime,
  moveItem,
  removeItem,
  removeMeal,
  type DraftMeal,
  type MealPlanDraft,
} from "../mappers/mealPlanDraft";
import "./style.css";

type MealCardProps = {
  meal: DraftMeal;
  index: number;
  count: number;
  name: string;
  /** The tag is archived: it stays on this meal but cannot be picked again. */
  isTagArchived: boolean;
  /** The live tags, plus this meal's own tag when it is archived. */
  tagOptions: SelectOption[];
  /** The food row a save was stopped on, because it has no name. */
  invalidItemKey: string | null;
  onDraftChange: (change: (draft: MealPlanDraft) => MealPlanDraft) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
};

export function MealCard({
  meal,
  index,
  count,
  name,
  isTagArchived,
  tagOptions,
  invalidItemKey,
  onDraftChange,
  onMove,
}: MealCardProps) {
  const titleId = useId();
  const archivedNoteId = useId();
  // The food field of the row just added takes the focus, so the coach can type right away.
  const [addedItemKey, setAddedItemKey] = useState<string | null>(null);
  const isItemsFull = meal.items.length >= MAX_ITEMS_PER_MEAL;

  const handleAddItem = () => {
    const itemKey = crypto.randomUUID();
    setAddedItemKey(itemKey);
    onDraftChange((draft) => addItem(draft, meal.key, () => itemKey));
  };

  return (
    <article
      className={cx("meal-card", isTagArchived && "meal-card--archived")}
      aria-labelledby={titleId}
      data-reorder-item
    >
      <ReorderHandle label={name} index={index} count={count} onMove={onMove} />

      <div className="body">
        <h3 id={titleId} className="sr-only">
          {`Pasto ${index + 1}: ${name}`}
        </h3>
        <div className="head">
          <Select
            className="tag-select"
            aria-label={`Tag del pasto ${index + 1}`}
            aria-describedby={isTagArchived ? archivedNoteId : undefined}
            value={String(meal.tagId)}
            options={tagOptions}
            onChange={(value) => onDraftChange((draft) => changeMealTag(draft, meal.key, Number(value)))}
          />
          <label className="time">
            Ora
            <input
              className="input-base"
              type="time"
              value={meal.timeOfDay}
              onChange={(event) =>
                onDraftChange((draft) => changeMealTime(draft, meal.key, event.target.value))
              }
            />
          </label>
          <ButtonIcon
            variant="ghost"
            className="remove-meal"
            aria-label={`Togli ${name}`}
            onClick={() => onDraftChange((draft) => removeMeal(draft, meal.key))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </ButtonIcon>
        </div>

        {isTagArchived ? (
          <p id={archivedNoteId} className="archived-note">
            Tag archiviato: resta in questo pasto, ma non puoi sceglierlo per altri.
          </p>
        ) : null}

        {meal.items.length === 0 ? (
          <p className="no-items">
            Nessun alimento. Aggiungine almeno uno o lascia il pasto vuoto come promemoria.
          </p>
        ) : (
          <ul className="items" aria-label={`Alimenti di ${name}`} data-reorder-list>
            {meal.items.map((item, itemIndex) => {
              const foodLabel = item.food.trim() === "" ? `alimento ${itemIndex + 1}` : item.food;
              const isFoodInvalid = item.key === invalidItemKey;
              const foodErrorId = `${titleId}-food-error`;

              return (
                <li
                  key={item.key}
                  className={cx("item", isFoodInvalid && "item--invalid")}
                  data-reorder-item
                >
                  <ReorderHandle
                    label={foodLabel}
                    index={itemIndex}
                    count={meal.items.length}
                    onMove={(fromIndex, toIndex) =>
                      onDraftChange((draft) => moveItem(draft, meal.key, fromIndex, toIndex))
                    }
                  />
                  <input
                    className="input-base food"
                    aria-label={`Alimento ${itemIndex + 1}`}
                    placeholder="Alimento"
                    aria-required="true"
                    aria-invalid={isFoodInvalid ? "true" : undefined}
                    aria-describedby={isFoodInvalid ? foodErrorId : undefined}
                    maxLength={MAX_FOOD_LENGTH}
                    value={item.food}
                    autoFocus={item.key === addedItemKey}
                    onChange={(event) =>
                      onDraftChange((draft) =>
                        changeItem(draft, meal.key, item.key, { food: event.target.value }),
                      )
                    }
                  />
                  {isFoodInvalid ? (
                    <p id={foodErrorId} className="input-error food-error">
                      Scrivi l&apos;alimento, oppure togli la riga.
                    </p>
                  ) : null}
                  <input
                    className="input-base quantity"
                    aria-label={`Quantità di ${foodLabel}`}
                    placeholder="Quantità"
                    maxLength={MAX_QUANTITY_LENGTH}
                    value={item.quantity}
                    onChange={(event) =>
                      onDraftChange((draft) =>
                        changeItem(draft, meal.key, item.key, { quantity: event.target.value }),
                      )
                    }
                  />
                  <ButtonIcon
                    variant="ghost"
                    className="remove-item"
                    aria-label={`Togli ${foodLabel}`}
                    onClick={() => onDraftChange((draft) => removeItem(draft, meal.key, item.key))}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </ButtonIcon>
                </li>
              );
            })}
          </ul>
        )}

        <div className="foot">
          <Button variant="secondary" size="sm" disabled={isItemsFull} onClick={handleAddItem}>
            Aggiungi alimento
          </Button>
          {isItemsFull ? (
            <span className="limit">Al massimo {MAX_ITEMS_PER_MEAL} alimenti per pasto.</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
