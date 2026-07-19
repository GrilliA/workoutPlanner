import { useId, useState } from "react";
import { Input } from "@components/input";
import type { CatalogExercise } from "@api";
import { useCatalogSearch } from "../useCatalogSearch";
import "./style.css";

export type ExercisePickerProps = {
  value: string;
  onChange: (name: string, catalogId: string | null) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
};

export function ExercisePicker({
  value,
  onChange,
  placeholder = "Cerca o digita un esercizio",
  required = false,
  autoFocus = false,
}: ExercisePickerProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const { query, setQuery, results, isSearching, error } = useCatalogSearch();

  const showResults = isOpen && query.trim().length >= 2;

  const handleInputChange = (next: string) => {
    setCatalogId(null);
    setQuery(next);
    onChange(next, null);
    setIsOpen(true);
  };

  const handleSelect = (exercise: CatalogExercise) => {
    setCatalogId(exercise.id);
    setQuery(exercise.name);
    onChange(exercise.name, exercise.id);
    setIsOpen(false);
  };

  return (
    <div className="exercise-picker">
      <Input.Root>
        <Input.Label>Nome esercizio</Input.Label>
        <Input.Field
          value={value}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            setQuery(value);
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

      {catalogId ? (
        <p className="hint selected">Dal catalogo</p>
      ) : value.trim().length > 0 ? (
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
            <li key={exercise.id}>
              <button
                type="button"
                className="result"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(exercise)}
              >
                <span className="name">{exercise.name}</span>
                <span className="meta">
                  {[exercise.primaryMuscles[0], exercise.equipment]
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
