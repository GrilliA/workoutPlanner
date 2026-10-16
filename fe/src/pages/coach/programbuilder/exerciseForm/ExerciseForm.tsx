import { useState, type FormEvent } from "react";
import { Button } from "@components/button";
import {
  createDefaultSetPrescriptions,
  EMPTY_PICKER_EXERCISE,
  pickerExerciseFrom,
  type NewExerciseInput,
  type PickerExercise,
} from "../types";
import { ExercisePicker } from "../exercisepicker";
import { SetPrescriptionEditor } from "../setprescriptioneditor";
import "./style.css";

export type ExerciseFormProps = {
  /** Exercise to edit; a new exercise starts empty with 3×10. */
  initialExercise?: NewExerciseInput;
  defaultRestSec: number;
  submitLabel: string;
  onSubmit: (input: NewExerciseInput) => void;
  onCancel: () => void;
};

export function ExerciseForm({
  initialExercise,
  defaultRestSec,
  submitLabel,
  onSubmit,
  onCancel,
}: ExerciseFormProps) {
  const [pickerExercise, setPickerExercise] = useState<PickerExercise>(() =>
    initialExercise ? pickerExerciseFrom(initialExercise) : { ...EMPTY_PICKER_EXERCISE },
  );
  const [setPrescriptions, setSetPrescriptions] = useState(() =>
    initialExercise
      ? initialExercise.setPrescriptions.map((entry) => ({ ...entry }))
      : createDefaultSetPrescriptions(3, 10, defaultRestSec),
  );

  // Editing usually means changing sets, so only a new exercise focuses the name field.
  const isNewExercise = initialExercise === undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ ...pickerExercise, setPrescriptions });
  };

  return (
    <form className="exercise-form" onSubmit={handleSubmit}>
      <ExercisePicker
        pickerExercise={pickerExercise}
        onChange={setPickerExercise}
        autoFocus={isNewExercise}
        required
      />

      <SetPrescriptionEditor
        prescriptions={setPrescriptions}
        onChange={setSetPrescriptions}
      />

      <div className="actions">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annulla
        </Button>

        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
