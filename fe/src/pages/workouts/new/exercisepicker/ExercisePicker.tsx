import { useId, useState } from "react";
import { Input } from "@components/input";
import type { CatalogExercise } from "@api";
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

export function ExercisePicker({
  pickerExercise,
  onChange,
  placeholder = "Cerca o digita un esercizio",
  required = false,
  autoFocus = false,
}: ExercisePickerProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const { query, setQuery, results, isSearching, error } = useCatalogSearch();

  const showResults = isOpen && query.trim().length >= 2;

  const handleInputChange = (next: string) => {
    setQuery(next);
    onChange({ ...EMPTY_PICKER_EXERCISE, name: next });
    setIsOpen(true);
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
    setIsOpen(false);
  };

  return (
    <div className="exercise-picker">
      <Input.Root>
        <Input.Label>Nome esercizio</Input.Label>
        <Input.Field
          value={pickerExercise.name}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            setQuery(pickerExercise.name);
            setIsOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required={required}
          role="combobox"
          aria-expanded={showResults}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </Input.Root>

      {pickerExercise.catalogId ? (
        <p className="hint selected">Dal catalogo</p>
      ) : pickerExercise.name.trim().length > 0 ? (
        <p className="hint">Testo libero — puoi anche scegliere dal catalogo</p>
      ) : null}

      {error ? <p className="hint error">{error}</p> : null}

      {showResults ? (
        <ul id={listId} className="results" role="listbox">
          {isSearching ? <li className="status">Cerco…</li> : null}
          {!isSearching && results.length === 0 ? (
            <li className="status">Nessun risultato — usa il nome digitato</li>
          ) : null}
          {results.map((exercise) => (
            <li key={exercise.id} className="result-row">
              <CatalogFlip
                imageUrl={exercise.imageUrl}
                imageUrlEnd={exercise.imageUrlEnd}
                variant="thumb"
              />
              <button
                type="button"
                className="result"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(exercise)}
              >
                <span className="name">{catalogDisplayName(exercise)}</span>
                {exercise.name !== catalogDisplayName(exercise) ? (
                  <span className="name-en">{exercise.name}</span>
                ) : null}
                <span className="meta">
                  {[muscleLabelIt(exercise.primaryMuscles[0]), equipmentLabelIt(exercise.equipment)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
