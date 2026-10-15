import { z } from "zod";
import type { WorkoutSessionWithSets } from "../../api/schemas/session";

/**
 * What the phone knows about one session while the network comes and goes:
 * the sets as the athlete sees them, plus the writes still to send. The queue
 * holds at most one write per set (same exercise and set number), in the order
 * the athlete made them, and the close always goes last.
 *
 * Pure: every function returns a new log and never touches disk or network.
 */

const setPositionSchema = z.object({
  exerciseId: z.number(),
  setNumber: z.number(),
});

const setValuesSchema = z.object({
  reps: z.number(),
  weightKg: z.number().nullable(),
  rir: z.number().nullable(),
  tutSec: z.number().nullable(),
  /** ISO time on the phone when the set was logged. */
  loggedAt: z.string(),
});

const loggedSetSchema = setPositionSchema.merge(setValuesSchema).extend({
  /** The server holds some version of this set, so removing it needs a delete. */
  onServer: z.boolean(),
});

const setWriteSchema = z.discriminatedUnion("kind", [
  setPositionSchema.extend({
    kind: z.literal("upsert"),
    values: setValuesSchema,
    revision: z.number(),
  }),
  setPositionSchema.extend({
    kind: z.literal("delete"),
    revision: z.number(),
  }),
]);

const closeWriteSchema = z.object({
  kind: z.literal("close"),
  status: z.enum(["completed", "abandoned"]),
  /** ISO time on the phone when the athlete closed the session. */
  completedAt: z.string(),
  revision: z.number(),
});

const offlineSessionLogSchema = z.object({
  version: z.literal(1),
  sessionId: z.number(),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  sets: z.array(loggedSetSchema),
  /** Oldest first: a new write for a set replaces the old one at the end. */
  pendingSetWrites: z.array(setWriteSchema),
  close: closeWriteSchema.nullable(),
  /** Bumped on every change, so a late answer from the server can tell it is stale. */
  nextRevision: z.number(),
});

export type SetPosition = z.infer<typeof setPositionSchema>;
export type SetValues = z.infer<typeof setValuesSchema>;
export type OfflineLoggedSet = z.infer<typeof loggedSetSchema>;
export type SetWrite = z.infer<typeof setWriteSchema>;
export type CloseWrite = z.infer<typeof closeWriteSchema>;
export type PendingWrite = SetWrite | CloseWrite;
export type OfflineSessionLog = z.infer<typeof offlineSessionLogSchema>;

export const isSameSet = (first: SetPosition, second: SetPosition): boolean =>
  first.exerciseId === second.exerciseId &&
  first.setNumber === second.setNumber;

/** Start from what the server holds: every set is already there, nothing to send. */
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
      onServer: true,
    }),
  );

  return {
    version: 1,
    sessionId: session.id,
    status: session.status,
    sets,
    pendingSetWrites: [],
    close: null,
    nextRevision: 1,
  };
}

/** Log a new set or change a logged one: one upsert per set, last values win. */
export function recordSet(
  log: OfflineSessionLog,
  position: SetPosition,
  values: SetValues,
): OfflineSessionLog {
  if (log.status !== "in_progress") {
    return log;
  }

  const previousSet = log.sets.find((set) => isSameSet(set, position));
  const previousWrite = log.pendingSetWrites.find((write) =>
    isSameSet(write, position),
  );
  // A queued delete means the server still has the set undone earlier.
  const deleteIsQueued = previousWrite?.kind === "delete";
  const serverHasSet = previousSet?.onServer ?? deleteIsQueued;

  const updatedSet: OfflineLoggedSet = {
    ...position,
    ...values,
    onServer: serverHasSet,
  };
  const upsert: SetWrite = {
    ...position,
    kind: "upsert",
    values,
    revision: log.nextRevision,
  };

  return {
    ...log,
    sets: [...setsOtherThan(log, position), updatedSet],
    pendingSetWrites: [...writesOtherThan(log, position), upsert],
    nextRevision: log.nextRevision + 1,
  };
}

/** Undo a set: nothing to send if the server never had it, else a delete. */
export function removeSet(
  log: OfflineSessionLog,
  position: SetPosition,
): OfflineSessionLog {
  const removedSet = log.sets.find((set) => isSameSet(set, position));

  if (log.status !== "in_progress" || !removedSet) {
    return log;
  }

  const remainingSets = setsOtherThan(log, position);
  const otherWrites = writesOtherThan(log, position);

  if (!removedSet.onServer) {
    // Never reached the server: dropping its queued upsert is enough.
    return {
      ...log,
      sets: remainingSets,
      pendingSetWrites: otherWrites,
      nextRevision: log.nextRevision + 1,
    };
  }

  const queuedDelete: SetWrite = {
    ...position,
    kind: "delete",
    revision: log.nextRevision,
  };

  return {
    ...log,
    sets: remainingSets,
    pendingSetWrites: [...otherWrites, queuedDelete],
    nextRevision: log.nextRevision + 1,
  };
}

/** TERMINA or abandon: the session takes no more sets, the close goes last. */
export function recordClose(
  log: OfflineSessionLog,
  status: CloseWrite["status"],
  completedAt: string,
): OfflineSessionLog {
  if (log.status !== "in_progress") {
    return log;
  }

  const close: CloseWrite = {
    kind: "close",
    status,
    completedAt,
    revision: log.nextRevision,
  };

  return {
    ...log,
    status,
    close,
    nextRevision: log.nextRevision + 1,
  };
}

/** Writes to send, oldest first; the close only after every set. */
export function pendingWrites(log: OfflineSessionLog): PendingWrite[] {
  if (!log.close) {
    return log.pendingSetWrites;
  }

  return [...log.pendingSetWrites, log.close];
}

/**
 * The server stored `write`. Drop it from the queue unless the athlete
 * changed the same set while it was on the way; that newer write stays queued.
 */
export function acknowledgeWrite(
  log: OfflineSessionLog,
  write: PendingWrite,
): OfflineSessionLog {
  if (write.kind === "close") {
    return acknowledgeClose(log, write);
  }

  return acknowledgeSetWrite(log, write);
}

function acknowledgeClose(
  log: OfflineSessionLog,
  close: CloseWrite,
): OfflineSessionLog {
  const isQueuedClose = log.close?.revision === close.revision;

  if (!isQueuedClose) {
    return log;
  }

  return { ...log, close: null };
}

function acknowledgeSetWrite(
  log: OfflineSessionLog,
  write: SetWrite,
): OfflineSessionLog {
  const pendingSetWrites = log.pendingSetWrites.filter(
    (queuedWrite) => queuedWrite.revision !== write.revision,
  );

  if (write.kind === "delete") {
    return { ...log, pendingSetWrites };
  }

  const currentSet = log.sets.find((set) => isSameSet(set, write));

  if (currentSet) {
    const sets = log.sets.map((set) =>
      isSameSet(set, write) ? { ...set, onServer: true } : set,
    );
    return { ...log, sets, pendingSetWrites };
  }

  // Undone while the upsert was on the way: the server now has a set the
  // athlete removed, so it needs a delete after all.
  const deleteIsQueued = pendingSetWrites.some((queuedWrite) =>
    isSameSet(queuedWrite, write),
  );

  if (deleteIsQueued) {
    return { ...log, pendingSetWrites };
  }

  const queuedDelete: SetWrite = {
    exerciseId: write.exerciseId,
    setNumber: write.setNumber,
    kind: "delete",
    revision: log.nextRevision,
  };

  return {
    ...log,
    pendingSetWrites: [...pendingSetWrites, queuedDelete],
    nextRevision: log.nextRevision + 1,
  };
}

function setsOtherThan(
  log: OfflineSessionLog,
  position: SetPosition,
): OfflineLoggedSet[] {
  return log.sets.filter((set) => !isSameSet(set, position));
}

function writesOtherThan(
  log: OfflineSessionLog,
  position: SetPosition,
): SetWrite[] {
  return log.pendingSetWrites.filter((write) => !isSameSet(write, position));
}

export function encodeOfflineSessionLog(log: OfflineSessionLog): string {
  return JSON.stringify(log);
}

/** A file for another session, from an older app or half written reads as none. */
export function decodeOfflineSessionLog(
  text: string,
  sessionId: number,
): OfflineSessionLog | null {
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }

  const parsed = offlineSessionLogSchema.safeParse(json);

  if (!parsed.success || parsed.data.sessionId !== sessionId) {
    return null;
  }

  return parsed.data;
}
