import { formatExerciseMeta } from "../../../workouts/new/mappers/mapExerciseMeta";
import { SetRow } from "../setrow";
import type { ActiveExerciseCard } from "../types";
import "./style.css";

export type ExerciseCardProps = {
  exercise: ActiveExerciseCard;
  defaultRestSec: number;
  isFocused: boolean;
  isResting: boolean;
  loggingKey: string | null;
  onFocus: () => void;
  onLogSet: (
    setNumber: number,
    weightKg: string,
    reps: number,
  ) => Promise<void>;
};

export function ExerciseCard({
  exercise,
  defaultRestSec,
  isFocused,
  isResting,
  loggingKey,
  onFocus,
  onLogSet,
}: ExerciseCardProps) {
  const meta = formatExerciseMeta(exercise.setPrescriptions, defaultRestSec);

  return (
    <article
      className={[
        "exercise-card",
        isFocused ? "exercise-card--active" : "",
        isResting ? "exercise-card--resting" : "",
        exercise.isComplete ? "exercise-card--done" : "",
        !isFocused && !exercise.isComplete ? "exercise-card--collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button type="button" className="header" onClick={onFocus}>
        <span className="index" aria-hidden="true">
          {exercise.index}
        </span>

        <div className="copy">
          <h3 className="name">{exercise.name}</h3>
          <p className="meta">
            {isResting ? <span className="resting-label">RECUPERO</span> : null}
            {isResting ? " · " : null}
            {meta}
          </p>
        </div>

        {exercise.isComplete ? (
          <span className="done" aria-label="Esercizio completato">
            ✓
          </span>
        ) : null}
      </button>

      {isFocused ? (
        <div className="sets sets-table">
          <div className="sets-header" aria-hidden="true">
            <span className="col-index">#</span>
            <span className="col-kg">KG</span>
            <span className="col-reps">REPS</span>
            <span className="col-rec">REC</span>
            <span className="col-action" />
          </div>

          <div className="sets-body">
            {exercise.sets.map((set) => {
              const key = `${exercise.exerciseId}:${set.setNumber}`;

              return (
                <SetRow
                  key={set.setNumber}
                  set={set}
                  isLogging={loggingKey === key}
                  onLog={(weightKg, reps) => onLogSet(set.setNumber, weightKg, reps)}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}
