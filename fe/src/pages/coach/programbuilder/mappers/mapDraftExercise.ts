import type { Exercise } from "@api";
import type { SetPrescription } from "@api/schemas/exercise";
import { pickerExerciseFrom, type DraftExercise, type DraftSetPrescription } from "../types";

const DEFAULT_REST_SEC = 90;

const mapSetPrescriptionToDraft = (entry: SetPrescription): DraftSetPrescription => ({
  setNumber: entry.setNumber,
  reps: entry.reps,
  repsMax: entry.repsMax ?? null,
  loadValue: entry.loadValue ?? null,
  loadUnit: entry.loadUnit ?? "kg",
  rir: entry.rir ?? null,
  restSec: entry.restSec ?? DEFAULT_REST_SEC,
});

const legacySetPrescription = (exercise: Exercise): DraftSetPrescription => ({
  setNumber: 1,
  reps: exercise.reps ?? 10,
  repsMax: null,
  loadValue: null,
  loadUnit: "kg",
  rir: null,
  restSec: DEFAULT_REST_SEC,
});

export function mapExerciseToDraft(exercise: Exercise): DraftExercise {
  const setPrescriptions =
    exercise.setPrescriptions.length > 0
      ? exercise.setPrescriptions.map(mapSetPrescriptionToDraft)
      : [legacySetPrescription(exercise)];

  return {
    clientId: crypto.randomUUID(),
    serverId: exercise.id,
    ...pickerExerciseFrom(exercise),
    notes: exercise.notes ?? "",
    setPrescriptions,
  };
}
