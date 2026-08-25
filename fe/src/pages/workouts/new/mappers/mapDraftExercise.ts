import type { Exercise } from "@api";
import { catalogSnapshotFrom, type DraftExercise } from "../types";

export function mapExerciseToDraft(exercise: Exercise): DraftExercise {
  return {
    clientId: crypto.randomUUID(),
    serverId: exercise.id,
    ...catalogSnapshotFrom(exercise),
    setPrescriptions:
      exercise.setPrescriptions.length > 0
        ? exercise.setPrescriptions.map((entry) => ({
            setNumber: entry.setNumber,
            reps: entry.reps,
            restSec: entry.restSec ?? 90,
          }))
        : [{ setNumber: 1, reps: exercise.reps ?? 10, restSec: 90 }],
  };
}
