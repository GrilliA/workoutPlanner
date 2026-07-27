export const REST_SEC_OPTIONS = [60, 90, 120, 150] as const;

export const WORKOUT_TYPE_OPTIONS = [
  "Forza + Ipertrofia",
  "Forza",
  "Ipertrofia",
  "Resistenza",
] as const;

export const FREQUENCY_OPTIONS = [
  "2× a settimana",
  "3× a settimana",
  "4× a settimana",
  "5× a settimana",
] as const;

export const DEFAULT_WORKOUT_SETTINGS = {
  defaultRestSec: 90,
  workoutType: "Forza + Ipertrofia",
  frequency: "3× a settimana",
} as const;

export type CreateWorkoutInput = {
  name: string;
  defaultRestSec: number;
  workoutType: string;
  frequency: string;
  /** Present only when the client explicitly sent it. */
  isActive?: boolean;
};

const isRestSec = (value: number): value is (typeof REST_SEC_OPTIONS)[number] =>
  (REST_SEC_OPTIONS as readonly number[]).includes(value);

const isWorkoutType = (
  value: string,
): value is (typeof WORKOUT_TYPE_OPTIONS)[number] =>
  (WORKOUT_TYPE_OPTIONS as readonly string[]).includes(value);

const isFrequency = (value: string): value is (typeof FREQUENCY_OPTIONS)[number] =>
  (FREQUENCY_OPTIONS as readonly string[]).includes(value);

export const validateCreateWorkoutInput = (
  body: unknown,
):
  | { ok: true; value: CreateWorkoutInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";

  if (!name) {
    return { ok: false, error: "name is required" };
  }

  const defaultRestSec =
    input.defaultRestSec === undefined
      ? DEFAULT_WORKOUT_SETTINGS.defaultRestSec
      : Number(input.defaultRestSec);

  if (!Number.isInteger(defaultRestSec) || !isRestSec(defaultRestSec)) {
    return { ok: false, error: "defaultRestSec must be one of 60, 90, 120, 150" };
  }

  const workoutType =
    input.workoutType === undefined
      ? DEFAULT_WORKOUT_SETTINGS.workoutType
      : String(input.workoutType);

  if (!isWorkoutType(workoutType)) {
    return { ok: false, error: "Invalid workoutType" };
  }

  const frequency =
    input.frequency === undefined
      ? DEFAULT_WORKOUT_SETTINGS.frequency
      : String(input.frequency);

  if (!isFrequency(frequency)) {
    return { ok: false, error: "Invalid frequency" };
  }

  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    return { ok: false, error: "isActive must be a boolean" };
  }

  return {
    ok: true,
    value: {
      name,
      defaultRestSec,
      workoutType,
      frequency,
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
    },
  };
};

export type UpdateWorkoutInput = Partial<CreateWorkoutInput>;

export const validateUpdateWorkoutInput = (
  body: unknown,
):
  | { ok: true; value: UpdateWorkoutInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const value: UpdateWorkoutInput = {};

  if ("name" in input) {
    const name = typeof input.name === "string" ? input.name.trim() : "";

    if (!name) {
      return { ok: false, error: "name cannot be empty" };
    }

    value.name = name;
  }

  if ("defaultRestSec" in input) {
    const defaultRestSec = Number(input.defaultRestSec);

    if (!Number.isInteger(defaultRestSec) || !isRestSec(defaultRestSec)) {
      return { ok: false, error: "defaultRestSec must be one of 60, 90, 120, 150" };
    }

    value.defaultRestSec = defaultRestSec;
  }

  if ("workoutType" in input) {
    const workoutType = String(input.workoutType);

    if (!isWorkoutType(workoutType)) {
      return { ok: false, error: "Invalid workoutType" };
    }

    value.workoutType = workoutType;
  }

  if ("frequency" in input) {
    const frequency = String(input.frequency);

    if (!isFrequency(frequency)) {
      return { ok: false, error: "Invalid frequency" };
    }

    value.frequency = frequency;
  }

  if ("isActive" in input) {
    if (typeof input.isActive !== "boolean") {
      return { ok: false, error: "isActive must be a boolean" };
    }

    value.isActive = input.isActive;
  }

  if (Object.keys(value).length === 0) {
    return { ok: false, error: "At least one field is required" };
  }

  return { ok: true, value };
};
