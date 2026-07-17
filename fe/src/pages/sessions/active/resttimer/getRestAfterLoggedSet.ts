import type { ActiveSessionView } from "../types";
import type { RestAfterLoggedSet } from "./types";

export function getRestAfterLoggedSet(
  view: ActiveSessionView,
  exerciseId: number,
  setNumber: number,
): RestAfterLoggedSet | null {
  const exercise = view.exercises.find((entry) => entry.exerciseId === exerciseId);

  if (!exercise) {
    return null;
  }

  const setRow = exercise.sets.find((entry) => entry.setNumber === setNumber);

  if (!setRow) {
    return null;
  }

  const maxSetNumber = Math.max(...exercise.sets.map((entry) => entry.setNumber));
  const isLastSetOfExercise = setNumber === maxSetNumber;

  const isLastSetOfSession = view.exercises.every((entry) =>
    entry.sets.every(
      (set) =>
        set.status === "completed" ||
        (entry.exerciseId === exerciseId && set.setNumber === setNumber),
    ),
  );

  return {
    restSec: setRow.restSec,
    shouldStart: !isLastSetOfExercise && !isLastSetOfSession,
  };
}
