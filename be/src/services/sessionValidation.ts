import { SESSION_STATUSES, type SessionStatus } from "../db/schema/workoutsessions";

export type LogSetInput = {
  exerciseId: number;
  setNumber: number;
  weightKg: number | null;
  reps: number;
  rir: number | null;
  tutSec: number | null;
};

/** A set sent with the close; the route keeps loggedAt inside the session. */
export type CloseSetInput = LogSetInput & {
  /** When the set was logged on the phone; null when the phone did not say. */
  loggedAt: Date | null;
};

export type PatchSessionInput = {
  status: "completed" | "abandoned";
  /** Present only on complete: replaces every set of the session in one write. */
  sets?: CloseSetInput[];
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

type Valid<T> = { ok: true; value: T };
type Invalid = { ok: false; error: string };

const validateCloseSet = (entry: unknown): Valid<CloseSetInput> | Invalid => {
  const parsed = validateLogSetInput(entry);

  if (!parsed.ok) {
    return parsed;
  }

  // validateLogSetInput already checked that entry is an object.
  const rawLoggedAt = (entry as { loggedAt?: unknown }).loggedAt;
  const loggedAt = parseOptionalTime("loggedAt", rawLoggedAt);

  if (!loggedAt.ok) {
    return loggedAt;
  }

  return { ok: true, value: { ...parsed.value, loggedAt: loggedAt.value } };
};

const isSameSet = (first: LogSetInput, second: LogSetInput): boolean =>
  first.exerciseId === second.exerciseId && first.setNumber === second.setNumber;

const validateLogSetList = (
  value: unknown,
): Valid<CloseSetInput[]> | Invalid => {
  if (!Array.isArray(value)) {
    return { ok: false, error: "sets must be an array" };
  }

  const results = value.map((entry) => validateCloseSet(entry));
  const firstInvalid = results.find((result): result is Invalid => !result.ok);

  if (firstInvalid) {
    return firstInvalid;
  }

  const sets = results
    .filter((result): result is Valid<CloseSetInput> => result.ok)
    .map((result) => result.value);
  const hasDuplicate = sets.some(
    (set, index) => sets.findIndex((other) => isSameSet(other, set)) !== index,
  );

  if (hasDuplicate) {
    return {
      ok: false,
      error: "sets must not contain duplicate exerciseId and setNumber",
    };
  }

  return { ok: true, value: sets };
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

  if (!("sets" in input) || input.sets === undefined) {
    return { ok: true, value: { status } };
  }

  if (status === "abandoned") {
    return { ok: false, error: "sets are not allowed when abandoning a session" };
  }

  const sets = validateLogSetList(input.sets);

  if (!sets.ok) {
    return sets;
  }

  return { ok: true, value: { status, sets: sets.value } };
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

/** A time from the phone: missing → null, an ISO string → its date, anything else → error. */
const parseOptionalTime = (
  field: string,
  value: unknown,
):
  | { ok: true; value: Date | null }
  | { ok: false; error: string } => {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  const time = typeof value === "string" ? new Date(value) : null;

  if (!time || Number.isNaN(time.getTime())) {
    return { ok: false, error: `${field} must be an ISO date-time string` };
  }

  return { ok: true, value: time };
};

/**
 * Hold a time from the phone between the session start and its end, so a
 * wrong phone clock cannot place it before the start or in the future.
 */
export const keepInsideSession = (
  time: Date,
  startedAt: Date,
  end: Date,
): Date => {
  if (time < startedAt) {
    return startedAt;
  }

  if (time > end) {
    return end;
  }

  return time;
};

/**
 * A time sent late from the phone (a set's loggedAt, a session's completedAt)
 * is kept inside the session window. Missing → now.
 */
export const clampToSessionWindow = (
  field: string,
  value: unknown,
  startedAt: Date,
  now: Date,
):
  | { ok: true; value: Date }
  | { ok: false; error: string } => {
  const parsed = parseOptionalTime(field, value);

  if (!parsed.ok) {
    return parsed;
  }

  if (parsed.value === null) {
    return { ok: true, value: now };
  }

  return { ok: true, value: keepInsideSession(parsed.value, startedAt, now) };
};
