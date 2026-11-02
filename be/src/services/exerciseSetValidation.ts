import { LOAD_UNITS, type LoadUnit } from "../db/schema/exercisesets";
import { MAX_SETS_PER_EXERCISE } from "./sessionValidation";

export type SetPrescription = {
  setNumber: number;
  reps: number;
  repsMax: number | null;
  loadValue: number | null;
  loadUnit: LoadUnit | null;
  rir: number | null;
  restSec: number | null;
};

type Invalid = { ok: false; error: string };
type Valid<T> = { ok: true; value: T };

const MAX_LOAD_KG = 1000;
const MAX_LOAD_PERCENT_1RM = 100;
const MAX_RIR = 10;
const MAX_EXERCISE_NOTES_LENGTH = 500;

const isMissing = (value: unknown): boolean => value === undefined || value === null;

const isLoadUnit = (value: unknown): value is LoadUnit =>
  LOAD_UNITS.some((unit) => unit === value);

const parseRepsMax = (value: unknown, reps: number): Valid<number | null> | Invalid => {
  if (isMissing(value)) {
    return { ok: true, value: null };
  }

  const repsMax = Number(value);

  if (!Number.isInteger(repsMax) || repsMax < reps) {
    return { ok: false, error: "repsMax must be an integer not lower than reps" };
  }

  // A range like 10–10 is just 10 reps: store it as a single value.
  return { ok: true, value: repsMax === reps ? null : repsMax };
};

const parseLoad = (
  rawValue: unknown,
  rawUnit: unknown,
): Valid<{ loadValue: number | null; loadUnit: LoadUnit | null }> | Invalid => {
  if (isMissing(rawValue) && isMissing(rawUnit)) {
    return { ok: true, value: { loadValue: null, loadUnit: null } };
  }

  if (!isLoadUnit(rawUnit)) {
    return { ok: false, error: "loadUnit must be kg or percent_1rm" };
  }

  const loadValue = Number(rawValue);
  const maxLoad = rawUnit === "kg" ? MAX_LOAD_KG : MAX_LOAD_PERCENT_1RM;
  const isValidLoad =
    !isMissing(rawValue) && Number.isFinite(loadValue) && loadValue > 0 && loadValue <= maxLoad;

  if (!isValidLoad) {
    return { ok: false, error: `loadValue must be a number between 0 and ${maxLoad}` };
  }

  return { ok: true, value: { loadValue, loadUnit: rawUnit } };
};

const parseRir = (value: unknown): Valid<number | null> | Invalid => {
  if (isMissing(value)) {
    return { ok: true, value: null };
  }

  const rir = Number(value);

  if (!Number.isInteger(rir) || rir < 0 || rir > MAX_RIR) {
    return { ok: false, error: `rir must be an integer between 0 and ${MAX_RIR}` };
  }

  return { ok: true, value: rir };
};

const validateSetPrescription = (
  item: unknown,
  defaultRestSec: number,
): Valid<SetPrescription> | Invalid => {
  if (!item || typeof item !== "object") {
    return { ok: false, error: "Invalid set prescription" };
  }

  const input = item as Record<string, unknown>;
  const setNumber = Number(input.setNumber);
  const reps = Number(input.reps);
  const restSec = isMissing(input.restSec) ? defaultRestSec : Number(input.restSec);

  if (!Number.isInteger(setNumber) || setNumber < 1) {
    return { ok: false, error: "setNumber must be a positive integer" };
  }

  if (!Number.isInteger(reps) || reps < 1) {
    return { ok: false, error: "reps must be a positive integer" };
  }

  if (!Number.isInteger(restSec) || restSec < 0) {
    return { ok: false, error: "restSec must be a non-negative integer" };
  }

  const repsMax = parseRepsMax(input.repsMax, reps);
  if (!repsMax.ok) {
    return repsMax;
  }

  const load = parseLoad(input.loadValue, input.loadUnit);
  if (!load.ok) {
    return load;
  }

  const rir = parseRir(input.rir);
  if (!rir.ok) {
    return rir;
  }

  return {
    ok: true,
    value: {
      setNumber,
      reps,
      repsMax: repsMax.value,
      loadValue: load.value.loadValue,
      loadUnit: load.value.loadUnit,
      rir: rir.value,
      restSec,
    },
  };
};

export const validateSetPrescriptions = (
  value: unknown,
  defaultRestSec: number,
): Valid<SetPrescription[]> | Invalid => {
  if (value === undefined) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "setPrescriptions must be an array" };
  }

  if (value.length === 0) {
    return { ok: false, error: "At least one set is required" };
  }

  if (value.length > MAX_SETS_PER_EXERCISE) {
    return {
      ok: false,
      error: `setPrescriptions must have at most ${MAX_SETS_PER_EXERCISE} sets`,
    };
  }

  const results = value.map((item) => validateSetPrescription(item, defaultRestSec));
  const firstInvalid = results.find((result): result is Invalid => !result.ok);

  if (firstInvalid) {
    return firstInvalid;
  }

  const prescriptions = results
    .filter((result): result is Valid<SetPrescription> => result.ok)
    .map((result) => result.value);
  const hasDuplicateSetNumber = prescriptions.some(
    (entry, index) =>
      prescriptions.findIndex((other) => other.setNumber === entry.setNumber) !== index,
  );

  if (hasDuplicateSetNumber) {
    return { ok: false, error: "Duplicate setNumber in setPrescriptions" };
  }

  const sorted = [...prescriptions].sort((a, b) => a.setNumber - b.setNumber);
  const usesConsecutiveNumbers = sorted.every((entry, index) => entry.setNumber === index + 1);

  if (!usesConsecutiveNumbers) {
    return { ok: false, error: "setPrescriptions must use consecutive set numbers from 1" };
  }

  return { ok: true, value: sorted };
};

export const validateExerciseNotes = (value: unknown): Valid<string | null> | Invalid => {
  if (isMissing(value)) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "notes must be a string" };
  }

  const notes = value.trim();

  if (notes.length > MAX_EXERCISE_NOTES_LENGTH) {
    return {
      ok: false,
      error: `notes must be at most ${MAX_EXERCISE_NOTES_LENGTH} characters`,
    };
  }

  return { ok: true, value: notes === "" ? null : notes };
};

export const summarizeSetPrescriptions = (
  prescriptions: SetPrescription[],
): { sets: number; reps: number | null } => ({
  sets: prescriptions.length,
  reps: prescriptions[0]?.reps ?? null,
});
