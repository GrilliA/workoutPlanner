import { isWeekday, type Weekday } from "./workoutSchedule";

export type CreateWorkoutDayInput = {
  name: string;
  sortOrder: number;
  weekdays: Weekday[];
};

export type UpdateWorkoutDayInput = {
  name?: string;
  sortOrder?: number;
};

export type SetWeekdaysInput = {
  weekdays: Weekday[];
};

export type ScheduleOverrideInput = {
  scheduledDate: string;
  workoutDayId: number;
};

export type StartSessionInput = {
  workoutDayId?: number;
};

export const validateCreateWorkoutDayInput = (
  body: unknown,
):
  | { ok: true; value: CreateWorkoutDayInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";

  if (!name) {
    return { ok: false, error: "name is required" };
  }

  const sortOrder =
    input.sortOrder === undefined ? 0 : Number(input.sortOrder);

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    return { ok: false, error: "sortOrder must be a non-negative integer" };
  }

  const weekdays = parseWeekdays(input.weekdays);

  if (!weekdays.ok) {
    return weekdays;
  }

  return {
    ok: true,
    value: { name, sortOrder, weekdays: weekdays.value },
  };
};

export const validateUpdateWorkoutDayInput = (
  body: unknown,
):
  | { ok: true; value: UpdateWorkoutDayInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const value: UpdateWorkoutDayInput = {};

  if ("name" in input) {
    const name = typeof input.name === "string" ? input.name.trim() : "";

    if (!name) {
      return { ok: false, error: "name cannot be empty" };
    }

    value.name = name;
  }

  if ("sortOrder" in input) {
    const sortOrder = Number(input.sortOrder);

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return { ok: false, error: "sortOrder must be a non-negative integer" };
    }

    value.sortOrder = sortOrder;
  }

  if (Object.keys(value).length === 0) {
    return { ok: false, error: "At least one field is required" };
  }

  return { ok: true, value };
};

export const validateSetWeekdaysInput = (
  body: unknown,
):
  | { ok: true; value: SetWeekdaysInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const weekdays = parseWeekdays((body as Record<string, unknown>).weekdays);

  if (!weekdays.ok) {
    return weekdays;
  }

  return { ok: true, value: { weekdays: weekdays.value } };
};

export const validateScheduleOverrideInput = (
  body: unknown,
):
  | { ok: true; value: ScheduleOverrideInput }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const scheduledDate =
    typeof input.scheduledDate === "string" ? input.scheduledDate : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    return { ok: false, error: "scheduledDate must be YYYY-MM-DD" };
  }

  const workoutDayId = Number(input.workoutDayId);

  if (!Number.isInteger(workoutDayId) || workoutDayId < 1) {
    return { ok: false, error: "workoutDayId must be a positive integer" };
  }

  return { ok: true, value: { scheduledDate, workoutDayId } };
};

export const validateStartSessionInput = (
  body: unknown,
):
  | { ok: true; value: StartSessionInput }
  | { ok: false; error: string } => {
  if (body === undefined || body === null) {
    return { ok: true, value: {} };
  }

  if (typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;

  if (input.workoutDayId === undefined) {
    return { ok: true, value: {} };
  }

  const workoutDayId = Number(input.workoutDayId);

  if (!Number.isInteger(workoutDayId) || workoutDayId < 1) {
    return { ok: false, error: "workoutDayId must be a positive integer" };
  }

  return { ok: true, value: { workoutDayId } };
};

const parseWeekdays = (
  value: unknown,
):
  | { ok: true; value: Weekday[] }
  | { ok: false; error: string } => {
  if (value === undefined) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "weekdays must be an array" };
  }

  const parsed = value.map((item) => Number(item));
  const invalid = parsed.find((weekday) => !isWeekday(weekday));

  if (invalid !== undefined) {
    return { ok: false, error: "weekdays must contain integers 0-6" };
  }

  const unique = [...new Set(parsed)].sort((a, b) => a - b) as Weekday[];

  return { ok: true, value: unique };
};
