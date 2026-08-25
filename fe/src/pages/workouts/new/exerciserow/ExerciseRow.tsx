import { formatExerciseMeta } from "../mappers/mapExerciseMeta";
import { exerciseEnglishLine, exerciseHeading } from "../mappers/mapExerciseDisplay";
import type { ExerciseDisplay } from "../types";
import { CatalogFlip } from "../catalogflip";
import "./style.css";

export type ExerciseRowProps = {
  index: number;
  exercise: ExerciseDisplay;
  defaultRestSec: number;
  onRemove?: () => void;
};

export function ExerciseRow({
  index,
  exercise,
  defaultRestSec,
  onRemove,
}: ExerciseRowProps) {
  const heading = exerciseHeading(exercise);
  const english = exerciseEnglishLine(exercise);

  return (
    <article className="exercise-row">
      <div className="media">
        <CatalogFlip
          imageUrl={exercise.imageUrl}
          imageUrlEnd={exercise.imageUrlEnd}
          variant="hero"
        />
        <span className="index" aria-hidden="true">
          {index}
        </span>
        {onRemove ? (
          <button
            type="button"
            className="remove"
            onClick={onRemove}
            aria-label={`Rimuovi ${heading}`}
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
        ) : null}
      </div>

      <div className="copy">
        <h3 className="name">{heading}</h3>
        {english ? <p className="name-en">{english}</p> : null}
        <p className="meta">
          {formatExerciseMeta(exercise.setPrescriptions, defaultRestSec)}
        </p>
      </div>
    </article>
  );
}
