import type { RecapExerciseCard } from "../types";
import "./style.css";

type RecapExerciseCardProps = {
  exercise: RecapExerciseCard;
};

const formatWeight = (weightKg: number | null): string => {
  if (weightKg === null) {
    return "—";
  }

  return `${weightKg} kg`;
};

export function RecapExerciseCardView({ exercise }: RecapExerciseCardProps) {
  return (
    <article className="recap-exercise-card">
      <div className="header">
        <span className="index" aria-hidden="true">
          {exercise.index}
        </span>
        <h3 className="name">{exercise.name}</h3>
      </div>

      {exercise.sets.length === 0 ? (
        <p className="empty">Nessuna serie registrata</p>
      ) : (
        <div className="sets">
          <div className="sets-header" aria-hidden="true">
            <span>#</span>
            <span>KG</span>
            <span>REPS</span>
          </div>

          {exercise.sets.map((set) => (
            <div key={set.setNumber} className="set-row">
              <span className="set-number">{set.setNumber}</span>
              <span className="weight">{formatWeight(set.weightKg)}</span>
              <span className="reps">{set.reps}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
