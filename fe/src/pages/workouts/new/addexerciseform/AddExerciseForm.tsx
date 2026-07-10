import { useState, type FormEvent } from "react";
import { Input } from "@components/input";
import { Button } from "@components/button";
import type { NewExerciseInput } from "../types";
import "./style.css";

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;

export type AddExerciseFormProps = {
  onAdd: (input: NewExerciseInput) => boolean;
};

export function AddExerciseForm({ onAdd }: AddExerciseFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [sets, setSets] = useState(String(DEFAULT_SETS));
  const [reps, setReps] = useState(String(DEFAULT_REPS));

  const resetForm = () => {
    setName("");
    setSets(String(DEFAULT_SETS));
    setReps(String(DEFAULT_REPS));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const added = onAdd({
      name,
      sets: Number(sets),
      reps: Number(reps),
    });

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
      <Input.Root>
        <Input.Label>Nome esercizio</Input.Label>
        <Input.Field
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Panca piana"
          autoFocus
          required
        />
      </Input.Root>

      <div className="numbers">
        <Input.Root>
          <Input.Label>Serie</Input.Label>
          <Input.Field
            type="number"
            min={1}
            step={1}
            value={sets}
            onChange={(event) => setSets(event.target.value)}
            required
          />
        </Input.Root>

        <Input.Root>
          <Input.Label>Reps</Input.Label>
          <Input.Field
            type="number"
            min={1}
            step={1}
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            required
          />
        </Input.Root>
      </div>

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
