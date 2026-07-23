import type { Exercise, LoggedSet } from "../../api";

export const WEIGHT_STEP_KG = 1.25;
const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 10;

/** Format weight for inputs without float noise (e.g. 2.5000001). */
export function formatWeightKg(kg: number): string {
  return String(Math.round(kg * 100) / 100);
}

export function parseWeightInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function stepWeightKg(current: string, direction: 1 | -1): string {
  const parsed = current.trim() === "" ? 0 : Number(current);
  const base = Number.isFinite(parsed) ? parsed : 0;
  const next = Math.max(0, Math.round((base + direction * WEIGHT_STEP_KG) * 100) / 100);
  return formatWeightKg(next);
}

export function stepReps(current: string, direction: 1 | -1): string {
  const parsed = current.trim() === "" ? 0 : Number(current);
  const base = Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
  return String(Math.max(1, base + direction));
}

/** Target set count from program prescriptions (fallback: legacy sets / 3). */
export function getTargetSetCount(exercise: Exercise): number {
  if (exercise.setPrescriptions.length > 0) {
    return exercise.setPrescriptions.length;
  }

  if (exercise.sets != null && exercise.sets > 0) {
    return exercise.sets;
  }

  return DEFAULT_TARGET_SETS;
}

export function getTargetRepsForSet(exercise: Exercise, setNumber: number): number {
  const prescription = exercise.setPrescriptions.find(
    (entry) => entry.setNumber === setNumber,
  );

  if (prescription) {
    return prescription.reps;
  }

  if (exercise.setPrescriptions[0]) {
    return exercise.setPrescriptions[0].reps;
  }

  if (exercise.reps != null && exercise.reps > 0) {
    return exercise.reps;
  }

  return DEFAULT_TARGET_REPS;
}

export function getRestSecForSet(
  exercise: Exercise,
  setNumber: number,
  defaultRestSec: number,
): number {
  const prescription = exercise.setPrescriptions.find(
    (entry) => entry.setNumber === setNumber,
  );

  return prescription?.restSec ?? exercise.setPrescriptions[0]?.restSec ?? defaultRestSec;
}

export function isExerciseComplete(exercise: Exercise, loggedCount: number): boolean {
  return loggedCount >= getTargetSetCount(exercise);
}

/**
 * Prefill priority: last logged set → next prescription reps → legacy reps → empty.
 * Weight comes only from the last logged set (prescriptions have no weight).
 */
export function resolveLogDefaults(
  exercise: Exercise,
  loggedSets: LoggedSet[],
): { weight: string; reps: string } {
  const ordered = [...loggedSets].sort((a, b) => a.setNumber - b.setNumber);
  const last = ordered.at(-1);
  const nextSetNumber = (last?.setNumber ?? 0) + 1;

  if (last) {
    return {
      weight: last.weightKg === null ? "" : formatWeightKg(last.weightKg),
      reps: String(last.reps),
    };
  }

  return {
    weight: "",
    reps: String(getTargetRepsForSet(exercise, nextSetNumber)),
  };
}
