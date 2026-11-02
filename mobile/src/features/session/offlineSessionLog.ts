import { z } from "zod";
import {
  setPositionSchema,
  type PatchSessionInput,
  type SetPosition,
  type WorkoutSessionWithSets,
} from "../../api/schemas/session";

/**
 * The session as the athlete sees it on the phone: every set logged so far
 * and, after TERMINA, the close still to send. The server gets it all at once
 * with the close, so nothing here tracks single writes.
 *
 * Pure: every function returns a new log and never touches disk or network.
 */

const loggedSetSchema = setPositionSchema.extend({
  reps: z.number(),
  weightKg: z.number().nullable(),
  rir: z.number().nullable(),
  tutSec: z.number().nullable(),
  /** ISO time on the phone when the set was logged. */
  loggedAt: z.string(),
});

const pendingCloseSchema = z.object({
  status: z.enum(["completed", "abandoned"]),
  /** ISO time on the phone when the athlete closed the session. */
  completedAt: z.string(),
});

const offlineSessionLogSchema = z.object({
  version: z.literal(1),
  sessionId: z.number(),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  sets: z.array(loggedSetSchema),
  /** Set by TERMINA or abandon, cleared once the server stored the close. */
  pendingClose: pendingCloseSchema.nullable(),
});

export type OfflineLoggedSet = z.infer<typeof loggedSetSchema>;
export type SetValues = Omit<OfflineLoggedSet, keyof SetPosition>;
export type PendingClose = z.infer<typeof pendingCloseSchema>;
export type OfflineSessionLog = z.infer<typeof offlineSessionLogSchema>;

export const isSameSet = (first: SetPosition, second: SetPosition): boolean =>
  first.exerciseId === second.exerciseId &&
  first.setNumber === second.setNumber;

/** Start from what the server holds when the session screen opens. */
export function createOfflineSessionLog(
  session: WorkoutSessionWithSets,
): OfflineSessionLog {
  const sets = session.sets.map(
    (serverSet): OfflineLoggedSet => ({
      exerciseId: serverSet.exerciseId,
      setNumber: serverSet.setNumber,
      reps: serverSet.reps,
      weightKg: serverSet.weightKg,
      rir: serverSet.rir,
      tutSec: serverSet.tutSec,
      loggedAt: serverSet.loggedAt.toISOString(),
    }),
  );

  return {
    version: 1,
    sessionId: session.id,
    status: session.status,
    sets,
    pendingClose: null,
  };
}

/** Log a new set or change a logged one; the last values win. */
export function recordSet(
  log: OfflineSessionLog,
  position: SetPosition,
  values: SetValues,
): OfflineSessionLog {
  if (log.status !== "in_progress") {
    return log;
  }

  const recordedSet: OfflineLoggedSet = { ...position, ...values };
  const alreadyLogged = log.sets.some((set) => isSameSet(set, position));

  if (!alreadyLogged) {
    return { ...log, sets: [...log.sets, recordedSet] };
  }

  const sets = log.sets.map((set) =>
    isSameSet(set, position) ? recordedSet : set,
  );

  return { ...log, sets };
}

/** Undo a set. */
export function removeSet(
  log: OfflineSessionLog,
  position: SetPosition,
): OfflineSessionLog {
  if (log.status !== "in_progress") {
    return log;
  }

  const sets = log.sets.filter((set) => !isSameSet(set, position));

  return { ...log, sets };
}

/** TERMINA or abandon: the session takes no more sets and waits to be sent. */
export function recordClose(
  log: OfflineSessionLog,
  status: PendingClose["status"],
  completedAt: string,
): OfflineSessionLog {
  if (log.status !== "in_progress") {
    return log;
  }

  return { ...log, status, pendingClose: { status, completedAt } };
}

/**
 * The PATCH body that closes the session on the server, or null when there
 * is nothing to send. An abandoned session sends no sets: the server keeps
 * none for it.
 */
export function closeRequest(log: OfflineSessionLog): PatchSessionInput | null {
  if (!log.pendingClose) {
    return null;
  }

  const { status, completedAt } = log.pendingClose;

  if (status === "abandoned") {
    return { status, completedAt };
  }

  return { status, completedAt, sets: log.sets };
}

function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function encodeOfflineSessionLog(log: OfflineSessionLog): string {
  return JSON.stringify(log);
}

/** A file from an older app or half written reads as none. */
export function decodeOfflineSessionLog(text: string): OfflineSessionLog | null {
  const parsed = offlineSessionLogSchema.safeParse(parseJsonOrNull(text));

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
