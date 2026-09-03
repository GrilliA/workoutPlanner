import { Input } from "@components/input";
import "./style.css";

export type WorkoutNameFieldProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
};

export function WorkoutNameField({
  value,
  onChange,
  error,
}: WorkoutNameFieldProps) {
  return (
    <section className="workout-name-field" aria-labelledby="workout-name-label">
      <Input
        id="workout-name"
        label="NOME SCHEDA"
        name="workoutName"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Push / Pull / Legs"
        autoComplete="off"
        required
        error={error ?? undefined}
      />
    </section>
  );
}
