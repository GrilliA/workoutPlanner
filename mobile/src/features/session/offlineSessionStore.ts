import { patchSession, type WorkoutSessionWithSets } from "../../api";
import type { PatchSessionInput } from "../../api/schemas/session";
import {
  createOfflineSessionLog,
  type OfflineSessionLog,
} from "./offlineSessionLog";
import {
  deleteOfflineSessionLog,
  readOfflineSessionLog,
  saveOfflineSessionLog,
} from "./offlineSessionLogFile";
import {
  retryDelayMs,
  sendPendingClose,
  type CloseSyncOutcome,
} from "./offlineSessionSync";

/**
 * The offline log of the session in use, in memory and on disk, and the
 * sending of its close. One per app: the athlete trains one session at a time.
 * Screens read it with useSyncExternalStore(subscribeOfflineSession, getOfflineSession).
 */

export type SyncStatus = "idle" | "sending" | "waiting" | "conflict";

export type OfflineSessionState = {
  userId: number;
  log: OfflineSessionLog;
  syncStatus: SyncStatus;
  failedAttempts: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
};

type Listener = () => void;

/** A problem of the log on the phone; the message is Italian, for the athlete. */
export class OfflineSessionError extends Error {}

/** The only changing value of this module; `publish` is the only place that sets it. */
let currentState: OfflineSessionState | null = null;
const listeners = new Set<Listener>();

export function getOfflineSession(): OfflineSessionState | null {
  return currentState;
}

export function subscribeOfflineSession(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function publish(nextState: OfflineSessionState | null): void {
  currentState = nextState;
  listeners.forEach((listener) => listener());
}

function newState(userId: number, log: OfflineSessionLog): OfflineSessionState {
  return {
    userId,
    log,
    syncStatus: "idle",
    failedAttempts: 0,
    retryTimer: null,
  };
}

function stopRetryTimer(): void {
  if (currentState?.retryTimer) {
    clearTimeout(currentState.retryTimer);
  }
}

/** App start, sign-in or foreground: pick up a close left by an earlier run and send it. */
export async function resumeOfflineSession(userId: number): Promise<void> {
  const isSameUser = currentState?.userId === userId;

  if (!isSameUser) {
    stopRetryTimer();
    const savedLog = await readOfflineSessionLog(userId);
    publish(savedLog ? newState(userId, savedLog) : null);
  }

  await sendCloseIfPending();
}

/**
 * The session screen opened. For the same session the phone wins: the server
 * gets the sets only with the close. A past session has no log (null) and
 * leaves the log of the session in use alone. Throws when an earlier session
 * still has a close the server has not stored.
 */
export async function openOfflineSession(
  userId: number,
  session: WorkoutSessionWithSets,
): Promise<OfflineSessionLog | null> {
  await resumeOfflineSession(userId);

  const savedLog = currentState?.log ?? null;

  if (savedLog?.sessionId === session.id) {
    return savedLog;
  }

  const isPastSession = session.status !== "in_progress";

  if (isPastSession) {
    return null;
  }

  const earlierCloseNotSent = savedLog?.pendingClose != null;

  if (earlierCloseNotSent) {
    throw new OfflineSessionError(
      "Un allenamento precedente non è ancora sincronizzato. Riprova con la rete.",
    );
  }

  const freshLog = createOfflineSessionLog(session);
  saveOfflineSessionLog(userId, freshLog);
  publish(newState(userId, freshLog));
  return freshLog;
}

/**
 * Apply an athlete action (log, edit, undo, TERMINA): on disk first, so it
 * survives the app being killed. A close is sent right away. Throws if the
 * disk write fails.
 */
export function changeOfflineSession(
  change: (log: OfflineSessionLog) => OfflineSessionLog,
): OfflineSessionLog {
  if (!currentState) {
    throw new OfflineSessionError("Nessuna sessione aperta");
  }

  const changedLog = change(currentState.log);
  saveOfflineSessionLog(currentState.userId, changedLog);
  publish({ ...currentState, log: changedLog });

  if (changedLog.pendingClose) {
    void sendCloseIfPending();
  }

  return changedLog;
}

/** The athlete saw the conflict: the unsaved session is dropped for good. */
export function dismissOfflineConflict(): void {
  if (!currentState) {
    return;
  }

  stopRetryTimer();
  deleteOfflineSessionLog(currentState.userId);
  publish(null);
}

async function sendCloseToServer(
  sessionId: number,
  request: PatchSessionInput,
): Promise<void> {
  await patchSession(sessionId, request);
}

/** Send the close if one is waiting; a send already on the way is not doubled. */
export async function sendCloseIfPending(): Promise<void> {
  const stateAtStart = currentState;
  const nothingToSend = !stateAtStart?.log.pendingClose;
  const alreadySending = stateAtStart?.syncStatus === "sending";
  const waitingForTheAthlete = stateAtStart?.syncStatus === "conflict";

  if (!stateAtStart || nothingToSend || alreadySending || waitingForTheAthlete) {
    return;
  }

  stopRetryTimer();
  publish({ ...stateAtStart, syncStatus: "sending", retryTimer: null });

  const outcome = await sendPendingClose(stateAtStart.log, sendCloseToServer);

  // The athlete may have signed out while the request was on the way.
  const stateNow = currentState;
  const isSameSession =
    stateNow?.userId === stateAtStart.userId &&
    stateNow.log.sessionId === stateAtStart.log.sessionId;

  if (stateNow && isSameSession) {
    applyOutcome(stateNow, outcome);
  }
}

function applyOutcome(
  state: OfflineSessionState,
  outcome: CloseSyncOutcome,
): void {
  if (outcome === "retry") {
    const failedAttempts = state.failedAttempts + 1;
    const retryTimer = setTimeout(() => {
      void sendCloseIfPending();
    }, retryDelayMs(failedAttempts));

    publish({ ...state, syncStatus: "waiting", failedAttempts, retryTimer });
    return;
  }

  if (outcome === "conflict") {
    publish({ ...state, syncStatus: "conflict", retryTimer: null });
    return;
  }

  // Sent, or nothing was waiting: the server has the session, the phone can forget it.
  if (outcome === "sent") {
    deleteOfflineSessionLog(state.userId);
  }

  const syncedLog = { ...state.log, pendingClose: null };
  publish(newState(state.userId, syncedLog));
}
