import { useState } from "react";
import type { NewExerciseInput } from "../types";
import { ExerciseForm } from "../exerciseForm";
import "./style.css";

export type AddExerciseFormProps = {
  defaultRestSec: number;
  onAdd: (input: NewExerciseInput) => boolean;
};

export function AddExerciseForm({ defaultRestSec, onAdd }: AddExerciseFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        className="add-exercise-trigger"
        onClick={() => setIsOpen(true)}
      >
        {/* An SVG, not a "+" glyph: the font draws the glyph off its line box centre. */}
        <span className="icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 5v14M5 12h14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>
        Aggiungi esercizio
      </button>
    );
  }

  // Closing unmounts ExerciseForm, so the next add starts from an empty form.
  return (
    <ExerciseForm
      defaultRestSec={defaultRestSec}
      submitLabel="Aggiungi"
      onSubmit={(input) => {
        const isAdded = onAdd(input);
        if (isAdded) {
          setIsOpen(false);
        }
      }}
      onCancel={() => setIsOpen(false)}
    />
  );
}
