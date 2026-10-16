import { useState, type FormEvent } from "react";
import { Button } from "@components/button";
import {
  createDefaultSetPrescriptions,
  EMPTY_PICKER_EXERCISE,
  type NewExerciseInput,
  type PickerExercise,
} from "../types";
import { ExercisePicker } from "../exercisepicker";
import { SetPrescriptionEditor } from "../setprescriptioneditor";
import "./style.css";

export type AddExerciseFormProps = {
  defaultRestSec: number;
  onAdd: (input: NewExerciseInput) => boolean;
};

export function AddExerciseForm({ defaultRestSec, onAdd }: AddExerciseFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerExercise, setPickerExercise] = useState<PickerExercise>({
    ...EMPTY_PICKER_EXERCISE,
  });
  const [setPrescriptions, setSetPrescriptions] = useState(() =>
    createDefaultSetPrescriptions(3, 10, defaultRestSec),
  );

  const resetForm = () => {
    setPickerExercise({ ...EMPTY_PICKER_EXERCISE });
    setSetPrescriptions(createDefaultSetPrescriptions(3, 10, defaultRestSec));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const added = onAdd({ ...pickerExercise, setPrescriptions });

    if (added) {
      resetForm();
      setIsOpen(false);
    }
  };

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

  return (
    <form className="add-exercise-form" onSubmit={handleSubmit}>
      <ExercisePicker
        pickerExercise={pickerExercise}
        onChange={setPickerExercise}
        autoFocus
        required
      />

      <SetPrescriptionEditor
        prescriptions={setPrescriptions}
        onChange={setSetPrescriptions}
      />

      <div className="actions">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
        >
          Annulla
        </Button>

        <Button type="submit" variant="primary">
          Aggiungi
        </Button>
      </div>
    </form>
  );
}
