import { formatExerciseMeta } from "../mappers/mapExerciseMeta";
import "./style.css";

export type ExerciseRowProps = {
  index: number;
  name: string;
  sets: number;
  reps: number;
  defaultRestSec: number;
  onRemove: () => void;
};

export function ExerciseRow({
  index,
  name,
  sets,
  reps,
  defaultRestSec,
  onRemove,
}: ExerciseRowProps) {
  return (
    <article className="exercise-row">
      <span className="index" aria-hidden="true">
        {index}
      </span>

      <div className="copy">
        <h3 className="name">{name}</h3>
        <p className="meta">{formatExerciseMeta(sets, reps, defaultRestSec)}</p>
      </div>

      <button
        type="button"
        className="remove"
        onClick={onRemove}
        aria-label={`Rimuovi ${name}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M18 6 6 18M6 6l12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </article>
  );
}
