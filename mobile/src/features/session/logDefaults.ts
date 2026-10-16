import type { Exercise } from "../../api";
import type { SetPrescription, SetSummary } from "../../api/schemas";

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

function findPrescriptionForSet(
  exercise: Exercise,
  setNumber: number,
): SetPrescription | undefined {
  return (
    exercise.setPrescriptions.find((entry) => entry.setNumber === setNumber) ??
    exercise.setPrescriptions[0]
  );
}

/** "8–12" for a range, "10" otherwise. */
export function formatTargetRepsForSet(exercise: Exercise, setNumber: number): string {
  const reps = getTargetRepsForSet(exercise, setNumber);
  const repsMax = findPrescriptionForSet(exercise, setNumber)?.repsMax;

  return repsMax ? `${reps}–${repsMax}` : String(reps);
}

function formatLoad(prescription: SetPrescription): string | null {
  if (prescription.loadValue == null || prescription.loadUnit == null) {
    return null;
  }

  const value = formatWeightKg(prescription.loadValue).replace(".", ",");

  return prescription.loadUnit === "kg" ? `${value} kg` : `${value}% 1RM`;
}

/**
 * What the coach asked for on this set beyond the reps: "80 kg · RIR 2".
 * Null when the plan has only reps and rest.
 */
export function formatSetTargetExtras(exercise: Exercise, setNumber: number): string | null {
  const prescription = findPrescriptionForSet(exercise, setNumber);

  if (!prescription) {
    return null;
  }

  const rir = prescription.rir == null ? null : `RIR ${prescription.rir}`;
  const parts = [formatLoad(prescription), rir].filter(
    (part): part is string => part !== null,
  );

  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Prescribed load in kg for the set; a %1RM load is not a weight the app can prefill. */
function prescribedWeightKg(exercise: Exercise, setNumber: number): string {
  const prescription = findPrescriptionForSet(exercise, setNumber);

  if (prescription?.loadUnit !== "kg" || prescription.loadValue == null) {
    return "";
  }

  return formatWeightKg(prescription.loadValue);
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

function weightFromPreviousSets(
  previousSets: SetSummary[],
  setNumber: number,
): string {
  const ordered = [...previousSets].sort((a, b) => a.setNumber - b.setNumber);
  const sameSet = ordered.find((set) => set.setNumber === setNumber);
  if (sameSet?.weightKg != null) {
    return formatWeightKg(sameSet.weightKg);
  }

  const lastWithWeight = [...ordered]
    .reverse()
    .find((set) => set.weightKg != null);
  return lastWithWeight?.weightKg == null
    ? ""
    : formatWeightKg(lastWithWeight.weightKg);
}

/**
 * Prefill priority:
 * - weight: last logged set this session, else previous session (same set, else last),
 *   else the load the coach prescribed in kg
 * - reps: next set prescription (so 10 → 8 plans advance correctly)
 */
export function resolveLogDefaults(
  exercise: Exercise,
  loggedSets: SetSummary[],
  previousSets: SetSummary[] = [],
): { weight: string; reps: string } {
  const ordered = [...loggedSets].sort((a, b) => a.setNumber - b.setNumber);
  const last = ordered.at(-1);
  const nextSetNumber = (last?.setNumber ?? 0) + 1;
  const firstWeightOfSession =
    weightFromPreviousSets(previousSets, nextSetNumber) ||
    prescribedWeightKg(exercise, nextSetNumber);

  return {
    weight:
      last != null
        ? last.weightKg === null
          ? ""
          : formatWeightKg(last.weightKg)
        : firstWeightOfSession,
    reps: String(getTargetRepsForSet(exercise, nextSetNumber)),
  };
}
