import type { DraftExercise } from "../types";
import { ExerciseRow } from "../exerciserow";
import "./style.css";

export type ExerciseListProps = {
  exercises: DraftExercise[];
  defaultRestSec: number;
  onRemove: (clientId: string) => void;
};

export function ExerciseList({
  exercises,
  defaultRestSec,
  onRemove,
}: ExerciseListProps) {
  return (
    <section className="exercise-list" aria-labelledby="exercise-list-title">
      <h2 id="exercise-list-title" className="title">
        ESERCIZI ({exercises.length})
      </h2>

      {exercises.length === 0 ? (
        <p className="empty">Nessun esercizio aggiunto</p>
      ) : (
        <ul className="list">
          {exercises.map((exercise, index) => (
            <li key={exercise.clientId}>
              <ExerciseRow
                index={index + 1}
                exercise={exercise}
                defaultRestSec={defaultRestSec}
                onRemove={() => onRemove(exercise.clientId)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
