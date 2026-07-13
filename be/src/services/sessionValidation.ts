import { SESSION_STATUSES, type SessionStatus } from "../db/schema/workoutsessions";

export type LogSetInput = {
  exerciseId: number;
  setNumber: number;
  weightKg: number | null;
  reps: number;
  rir: number | null;
  tutSec: number | null;
};

export type PatchSessionInput = {
  status: "completed" | "abandoned";
};

export type PatchLoggedSetInput = {
  weightKg?: number | null;
  reps?: number;
  rir?: number | null;
  tutSec?: number | null;
};

const isSessionStatus = (value: string): value is SessionStatus =>
  (SESSION_STATUSES as readonly string[]).includes(value);

const parseOptionalInt = (
  value: unknown,
  field: string,
): { ok: true; value: number | null } | { ok: false; error: string } => {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, error: `${field} must be an integer` };
  }

  return { ok: true, value };
};

const parseOptionalWeight = (
  value: unknown,
): { ok: true; value: number | null } | { ok: false; error: string } => {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "number" || value < 0) {
    return { ok: false, error: "weightKg must be a non-negative number" };
  }

  return { ok: true, value };
};

export const validateLogSetInput = (
  body: unknown,
):
  | { ok: true; value: LogSetInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const exerciseId = Number(input.exerciseId);
  const setNumber = Number(input.setNumber);
  const reps = Number(input.reps);

  if (!Number.isInteger(exerciseId) || exerciseId < 1) {
    return { ok: false, error: "exerciseId must be a positive integer" };
  }

  if (!Number.isInteger(setNumber) || setNumber < 1) {
    return { ok: false, error: "setNumber must be a positive integer" };
  }

  if (!Number.isInteger(reps) || reps < 1) {
    return { ok: false, error: "reps must be a positive integer" };
  }

  const weight = parseOptionalWeight(input.weightKg);

  if (!weight.ok) {
    return weight;
  }

  const rir = parseOptionalInt(input.rir, "rir");

  if (!rir.ok) {
    return rir;
  }

  if (rir.value !== null && (rir.value < 0 || rir.value > 10)) {
    return { ok: false, error: "rir must be between 0 and 10" };
  }

  const tutSec = parseOptionalInt(input.tutSec, "tutSec");

  if (!tutSec.ok) {
    return tutSec;
  }

  if (tutSec.value !== null && tutSec.value < 0) {
    return { ok: false, error: "tutSec must be non-negative" };
  }

  return {
    ok: true,
    value: {
      exerciseId,
      setNumber,
      weightKg: weight.value,
      reps,
      rir: rir.value,
      tutSec: tutSec.value,
    },
  };
};

export const validatePatchSessionInput = (
  body: unknown,
):
  | { ok: true; value: PatchSessionInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const status = typeof input.status === "string" ? input.status : "";

  if (status !== "completed" && status !== "abandoned") {
    return { ok: false, error: "status must be completed or abandoned" };
  }

  return { ok: true, value: { status } };
};

export const validatePatchLoggedSetInput = (
  body: unknown,
):
  | { ok: true; value: PatchLoggedSetInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const value: PatchLoggedSetInput = {};

  if ("weightKg" in input) {
    const weight = parseOptionalWeight(input.weightKg);

    if (!weight.ok) {
      return weight;
    }

    value.weightKg = weight.value;
  }

  if ("reps" in input) {
    const reps = Number(input.reps);

    if (!Number.isInteger(reps) || reps < 1) {
      return { ok: false, error: "reps must be a positive integer" };
    }

    value.reps = reps;
  }

  if ("rir" in input) {
    const rir = parseOptionalInt(input.rir, "rir");

    if (!rir.ok) {
      return rir;
    }

    if (rir.value !== null && (rir.value < 0 || rir.value > 10)) {
      return { ok: false, error: "rir must be between 0 and 10" };
    }

    value.rir = rir.value;
  }

  if ("tutSec" in input) {
    const tutSec = parseOptionalInt(input.tutSec, "tutSec");

    if (!tutSec.ok) {
      return tutSec;
    }

    if (tutSec.value !== null && tutSec.value < 0) {
      return { ok: false, error: "tutSec must be non-negative" };
    }

    value.tutSec = tutSec.value;
  }

  if (Object.keys(value).length === 0) {
    return { ok: false, error: "At least one field is required" };
  }

  return { ok: true, value };
};

export const isValidSessionStatus = isSessionStatus;
