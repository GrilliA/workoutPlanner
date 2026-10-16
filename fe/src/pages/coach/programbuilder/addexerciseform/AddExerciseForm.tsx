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
        <span className="icon" aria-hidden="true">
          +
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
