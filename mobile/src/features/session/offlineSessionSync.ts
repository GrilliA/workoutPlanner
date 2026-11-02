import { closeRequest, type OfflineSessionLog } from "./offlineSessionLog";
import type { PatchSessionInput } from "../../api/schemas/session";

/**
 * Sending a session closed on the phone: one PATCH with the close and every
 * set. Sending it twice is safe (the server answers a repeated close with the
 * saved session), so a retry never needs to know whether the first one landed.
 *
 * No React, no disk, no fetch: the caller passes the request in.
 */

export type CloseSyncOutcome = "nothing-to-send" | "sent" | "retry" | "conflict";

export type SendClose = (
  sessionId: number,
  request: PatchSessionInput,
) => Promise<void>;

const FIRST_RETRY_DELAY_MS = 2_000;
const LONGEST_RETRY_DELAY_MS = 60_000;

/** ApiError carries the HTTP status; 0 means the request got no answer. */
const statusOf = (error: unknown): number | null => {
  const hasStatus =
    typeof error === "object" &&
    error !== null &&
    typeof (error as { status?: unknown }).status === "number";

  return hasStatus ? (error as { status: number }).status : null;
};

/**
 * No answer, a server failure or an expired sign-in can pass: try again.
 * Anything else means the server will not take this close as it is.
 */
export function classifySyncError(error: unknown): "retry" | "conflict" {
  const status = statusOf(error);
  const noAnswer = status === null || status === 0;
  const serverFailed = status !== null && status >= 500;
  // The token refresh failed too: the next try may get a new token.
  const notSignedIn = status === 401;

  if (noAnswer || serverFailed || notSignedIn) {
    return "retry";
  }

  return "conflict";
}

/** 2 s, 4 s, 8 s … up to one minute. */
export function retryDelayMs(failedAttempts: number): number {
  const doubled = FIRST_RETRY_DELAY_MS * 2 ** Math.max(0, failedAttempts - 1);

  return Math.min(doubled, LONGEST_RETRY_DELAY_MS);
}

export async function sendPendingClose(
  log: OfflineSessionLog,
  sendClose: SendClose,
): Promise<CloseSyncOutcome> {
  const request = closeRequest(log);

  if (!request) {
    return "nothing-to-send";
  }

  try {
    await sendClose(log.sessionId, request);
    return "sent";
  } catch (error) {
    return classifySyncError(error);
  }
}
