export type SetPrescription = {
  setNumber: number;
  reps: number;
  restSec: number | null;
};

export const validateSetPrescriptions = (
  value: unknown,
  defaultRestSec: number,
):
  | { ok: true; value: SetPrescription[] }
  | { ok: false; error: string } => {
  if (value === undefined) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "setPrescriptions must be an array" };
  }

  if (value.length === 0) {
    return { ok: false, error: "At least one set is required" };
  }

  const prescriptions: SetPrescription[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "Invalid set prescription" };
    }

    const input = item as Record<string, unknown>;
    const setNumber = Number(input.setNumber);
    const reps = Number(input.reps);
    const restSec =
      input.restSec === undefined || input.restSec === null
        ? defaultRestSec
        : Number(input.restSec);

    if (!Number.isInteger(setNumber) || setNumber < 1) {
      return { ok: false, error: "setNumber must be a positive integer" };
    }

    if (!Number.isInteger(reps) || reps < 1) {
      return { ok: false, error: "reps must be a positive integer" };
    }

    if (!Number.isInteger(restSec) || restSec < 0) {
      return { ok: false, error: "restSec must be a non-negative integer" };
    }

    if (prescriptions.some((entry) => entry.setNumber === setNumber)) {
      return { ok: false, error: "Duplicate setNumber in setPrescriptions" };
    }

    prescriptions.push({ setNumber, reps, restSec });
  }

  const sorted = [...prescriptions].sort((a, b) => a.setNumber - b.setNumber);
  const expectedNumbers = sorted.map((_, index) => index + 1);

  if (!sorted.every((entry, index) => entry.setNumber === expectedNumbers[index])) {
    return { ok: false, error: "setPrescriptions must use consecutive set numbers from 1" };
  }

  return { ok: true, value: sorted };
};

export const summarizeSetPrescriptions = (
  prescriptions: SetPrescription[],
): { sets: number; reps: number | null } => ({
  sets: prescriptions.length,
  reps: prescriptions[0]?.reps ?? null,
});
