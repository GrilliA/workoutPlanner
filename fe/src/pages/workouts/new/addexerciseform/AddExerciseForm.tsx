import { useState, type FormEvent } from "react";
import { Button } from "@components/button";
import { createDefaultSetPrescriptions, type NewExerciseInput } from "../types";
import { ExercisePicker } from "../exercisepicker";
import { SetPrescriptionEditor } from "../setprescriptioneditor";
import "./style.css";

export type AddExerciseFormProps = {
  defaultRestSec: number;
  onAdd: (input: NewExerciseInput) => boolean;
};

export function AddExerciseForm({ defaultRestSec, onAdd }: AddExerciseFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [setPrescriptions, setSetPrescriptions] = useState(() =>
    createDefaultSetPrescriptions(3, 10, defaultRestSec),
  );

  const resetForm = () => {
    setName("");
    setCatalogId(null);
    setSetPrescriptions(createDefaultSetPrescriptions(3, 10, defaultRestSec));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const added = onAdd({ name, setPrescriptions, catalogId });

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
        value={name}
        onChange={(nextName, nextCatalogId) => {
          setName(nextName);
          setCatalogId(nextCatalogId);
        }}
        autoFocus
        required
      />

      <SetPrescriptionEditor
        prescriptions={setPrescriptions}
        onChange={setSetPrescriptions}
      />

      <div className="actions">
        <Button.Root
          type="button"
          variant="ghost"
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
        >
          <Button.Label>Annulla</Button.Label>
        </Button.Root>

        <Button.Root type="submit" variant="primary">
          <Button.Label>Aggiungi</Button.Label>
        </Button.Root>
      </div>
    </form>
  );
}
