import type { AssignmentStatus } from "../db/schema/programassignments";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type AssignmentDatesInput = {
  startsAt: string;
  expiresAt: string;
};

export type AssignmentDatesPatch = {
  startsAt?: string;
  expiresAt?: string;
};

export const isActiveForStatus = (status: string): boolean => status === "active";

export const isValidIsoDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const validateAssignmentDates = (
  body: unknown,
): { ok: true; value: AssignmentDatesInput } | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const startsAt = typeof input.startsAt === "string" ? input.startsAt : "";
  const expiresAt = typeof input.expiresAt === "string" ? input.expiresAt : "";

  if (!isValidIsoDate(startsAt)) {
    return { ok: false, error: "startsAt must be YYYY-MM-DD" };
  }

  if (!isValidIsoDate(expiresAt)) {
    return { ok: false, error: "expiresAt must be YYYY-MM-DD" };
  }

  if (expiresAt < startsAt) {
    return { ok: false, error: "expiresAt must be on or after startsAt" };
  }

  return { ok: true, value: { startsAt, expiresAt } };
};

export type PartialAssignmentDatesInput = {
  startsAt?: string;
  expiresAt?: string;
};

export const validatePartialAssignmentDates = (
  body: unknown,
  existing: AssignmentDatesInput,
): { ok: true; value: AssignmentDatesInput } | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const hasStartsAt = input.startsAt !== undefined;
  const hasExpiresAt = input.expiresAt !== undefined;

  if (!hasStartsAt && !hasExpiresAt) {
    return { ok: false, error: "At least one of startsAt or expiresAt is required" };
  }

  const startsAt = hasStartsAt
    ? typeof input.startsAt === "string"
      ? input.startsAt
      : ""
    : existing.startsAt;
  const expiresAt = hasExpiresAt
    ? typeof input.expiresAt === "string"
      ? input.expiresAt
      : ""
    : existing.expiresAt;

  if (hasStartsAt && !isValidIsoDate(startsAt)) {
    return { ok: false, error: "startsAt must be YYYY-MM-DD" };
  }

  if (hasExpiresAt && !isValidIsoDate(expiresAt)) {
    return { ok: false, error: "expiresAt must be YYYY-MM-DD" };
  }

  if (expiresAt < startsAt) {
    return { ok: false, error: "expiresAt must be on or after startsAt" };
  }

  return { ok: true, value: { startsAt, expiresAt } };
};

export const mergeAssignmentDates = (
  existing: AssignmentDatesInput,
  patch: AssignmentDatesPatch,
): { ok: true; value: AssignmentDatesInput } | { ok: false; error: string } =>
  validateAssignmentDates({
    startsAt: patch.startsAt ?? existing.startsAt,
    expiresAt: patch.expiresAt ?? existing.expiresAt,
  });

/** Calendar date in Europe/Rome as YYYY-MM-DD. */
export const todayInRome = (now = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
};

export const computeAssignmentStatus = (
  startsAt: string,
  expiresAt: string,
  today = todayInRome(),
  revoked = false,
): AssignmentStatus => {
  if (revoked) {
    return "revoked";
  }

  if (today < startsAt) {
    return "scheduled";
  }

  if (today > expiresAt) {
    return "expired";
  }

  return "active";
};

export const daysUntilExpiry = (
  expiresAt: string,
  today = todayInRome(),
): number => {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${expiresAt}T00:00:00Z`);
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
};
