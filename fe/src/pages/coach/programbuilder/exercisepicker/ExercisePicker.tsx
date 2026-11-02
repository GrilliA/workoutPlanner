import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Input } from "@components/input";
import type { CatalogExercise } from "@api";
import { cx } from "@utils/cx";
import { useFloatingListbox } from "@utils/useFloatingListbox";
import { useCatalogSearch } from "../useCatalogSearch";
import { CatalogFlip } from "../catalogflip";
import { EMPTY_PICKER_EXERCISE, type PickerExercise } from "../types";
import { catalogDisplayName, equipmentLabelIt, muscleLabelIt } from "./labels";
import "./style.css";

export type ExercisePickerProps = {
  pickerExercise: PickerExercise;
  onChange: (pickerExercise: PickerExercise) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
};

const RESULTS_MAX_HEIGHT = 288;
const MIN_QUERY_LENGTH = 2;

/** -1 means no result is highlighted: Enter keeps the typed name. */
const NO_ACTIVE_RESULT = -1;

function exerciseMeta(exercise: CatalogExercise): string {
  return [muscleLabelIt(exercise.primaryMuscles[0]), equipmentLabelIt(exercise.equipment)]
    .filter(Boolean)
    .join(" · ");
}

export function ExercisePicker({
  pickerExercise,
  onChange,
  placeholder = "Cerca o digita un esercizio",
  required = false,
  autoFocus = false,
}: ExercisePickerProps) {
  const listId = useId();
  const resultId = (index: number) => `${listId}-result-${index}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_RESULT);
  const { query, setQuery, results, isSearching, error } = useCatalogSearch(MIN_QUERY_LENGTH);

  const showResults = isOpen && query.trim().length >= MIN_QUERY_LENGTH;
  const activeExercise = showResults ? results[activeIndex] : undefined;
  const attachResults = useFloatingListbox(inputRef, showResults, {
    maxHeight: RESULTS_MAX_HEIGHT,
    matchTriggerWidth: true,
  });

  const openResults = () => {
    setActiveIndex(NO_ACTIVE_RESULT);
    setIsOpen(true);
  };

  const closeResults = () => setIsOpen(false);

  const handleInputChange = (next: string) => {
    setQuery(next);
    onChange({ ...EMPTY_PICKER_EXERCISE, name: next });
    openResults();
  };

  const handleSelect = (exercise: CatalogExercise) => {
    const name = catalogDisplayName(exercise);
    setQuery(name);
    onChange({
      name,
      catalogId: exercise.id,
      nameIt: exercise.nameIt,
      nameEn: exercise.name,
      imageUrl: exercise.imageUrl,
      imageUrlEnd: exercise.imageUrlEnd,
    });
    closeResults();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!showResults) {
        openResults();
        return;
      }
      const lastIndex = results.length - 1;
      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(activeIndex + 1, lastIndex)
          : Math.max(activeIndex - 1, NO_ACTIVE_RESULT);
      setActiveIndex(nextIndex);
      return;
    }

    // Without a highlighted result Enter keeps its default: submit the exercise form.
    if (event.key === "Enter" && activeExercise) {
      event.preventDefault();
      handleSelect(activeExercise);
      return;
    }

    if (event.key === "Escape") {
      closeResults();
    }
  };

  useEffect(() => {
    if (!showResults || activeIndex === NO_ACTIVE_RESULT) return;
    const activeResult = document.getElementById(`${listId}-result-${activeIndex}`);
    activeResult?.scrollIntoView({ block: "nearest" });
  }, [showResults, activeIndex, listId]);

  const hasNoResults = !isSearching && results.length === 0;
  const activeDescendant = activeExercise ? resultId(activeIndex) : undefined;

  return (
    <div className="exercise-picker">
      <Input
        ref={inputRef}
        id="picker-exercise-name"
        label="Nome esercizio"
        value={pickerExercise.name}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => {
          setQuery(pickerExercise.name);
          openResults();
        }}
        onBlur={closeResults}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required}
        role="combobox"
        aria-expanded={showResults}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        autoComplete="off"
      />

      {pickerExercise.catalogId ? (
        <p className="hint selected">Dal catalogo</p>
      ) : pickerExercise.name.trim().length > 0 ? (
        <p className="hint">Testo libero — puoi anche scegliere dal catalogo</p>
      ) : null}

      {error ? <p className="hint error">{error}</p> : null}

      {showResults ? (
        <ul
          ref={attachResults}
          id={listId}
          className="results"
          role="listbox"
          aria-label="Esercizi dal catalogo"
          aria-busy={isSearching}
          popover="manual"
        >
          {isSearching ? (
            <li className="status" role="presentation">
              Cerco…
            </li>
          ) : null}
          {hasNoResults ? (
            <li className="status" role="presentation">
              Nessun risultato — usa il nome digitato
            </li>
          ) : null}
          {results.map((exercise, index) => (
            <li
              key={exercise.id}
              id={resultId(index)}
              role="option"
              aria-selected={index === activeIndex}
              className={cx("result-row", index === activeIndex && "result-row--active")}
              // Keep focus in the input so blur does not close the list before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleSelect(exercise)}
            >
              <CatalogFlip
                imageUrl={exercise.imageUrl}
                imageUrlEnd={exercise.imageUrlEnd}
                variant="thumb"
              />
              <span className="result">
                <span className="name">{catalogDisplayName(exercise)}</span>
                {exercise.name !== catalogDisplayName(exercise) ? (
                  <span className="name-en">{exercise.name}</span>
                ) : null}
                <span className="meta">{exerciseMeta(exercise)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
