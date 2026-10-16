import { useState } from "react";
import type { DraftExercise, NewExerciseInput } from "../types";
import type { MoveDirection } from "../workoutForm";
import { ExerciseRow } from "../exerciserow";
import { ExerciseForm } from "../exerciseForm";
import { exerciseHeading } from "../mappers/mapExerciseDisplay";
import "./style.css";

export type ExerciseListProps = {
  exercises: DraftExercise[];
  defaultRestSec: number;
  onRemove: (clientId: string) => void;
  onMove: (clientId: string, direction: MoveDirection) => void;
  onUpdate: (clientId: string, input: NewExerciseInput) => boolean;
};

export function ExerciseList({
  exercises,
  defaultRestSec,
  onRemove,
  onMove,
  onUpdate,
}: ExerciseListProps) {
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  return (
    <section className="exercise-list" aria-labelledby="exercise-list-title">
      <h2 id="exercise-list-title" className="title">
        ESERCIZI ({exercises.length})
      </h2>

      {exercises.length === 0 ? (
        <p className="empty">Nessun esercizio aggiunto</p>
      ) : (
        <ul className="list">
          {exercises.map((exercise, index) => {
            const heading = exerciseHeading(exercise);
            const isFirst = index === 0;
            const isLast = index === exercises.length - 1;

            if (exercise.clientId === editingExerciseId) {
              return (
                <li key={exercise.clientId}>
                  <ExerciseForm
                    initialExercise={exercise}
                    defaultRestSec={defaultRestSec}
                    submitLabel="Salva"
                    onSubmit={(input) => {
                      const isUpdated = onUpdate(exercise.clientId, input);
                      if (isUpdated) {
                        setEditingExerciseId(null);
                      }
                    }}
                    onCancel={() => setEditingExerciseId(null)}
                  />
                </li>
              );
            }

            return (
              <li key={exercise.clientId}>
                <ExerciseRow
                  index={index + 1}
                  exercise={exercise}
                  defaultRestSec={defaultRestSec}
                  onRemove={() => onRemove(exercise.clientId)}
                  actions={
                    <>
                      <button
                        type="button"
                        className="row-action"
                        aria-label={`Sposta su ${heading}`}
                        disabled={isFirst}
                        onClick={() => onMove(exercise.clientId, "earlier")}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="row-action"
                        aria-label={`Sposta giù ${heading}`}
                        disabled={isLast}
                        onClick={() => onMove(exercise.clientId, "later")}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="row-action"
                        onClick={() => setEditingExerciseId(exercise.clientId)}
                      >
                        Modifica
                      </button>
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
