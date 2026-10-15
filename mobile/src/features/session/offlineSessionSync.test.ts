import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkoutSessionWithSets } from "../../api/schemas";
import {
  createOfflineSessionLog,
  recordClose,
  recordSet,
  type OfflineSessionLog,
} from "./offlineSessionLog";
import {
  classifySyncError,
  retryDelayMs,
  sendPendingClose,
} from "./offlineSessionSync";

const openSession: WorkoutSessionWithSets = {
  id: 7,
  workoutId: 3,
  workoutDayId: 4,
  userId: 2,
  status: "in_progress",
  startedAt: new Date("2026-10-14T08:00:00.000Z"),
  completedAt: null,
  notes: null,
  sets: [],
};

const openLog = (): OfflineSessionLog => {
  const emptyLog = createOfflineSessionLog(openSession);

  return recordSet(
    emptyLog,
    { exerciseId: 10, setNumber: 1 },
    {
      reps: 8,
      weightKg: 60,
      rir: null,
      tutSec: null,
      loggedAt: "2026-10-14T08:10:00.000Z",
    },
  );
};

const closedLog = (): OfflineSessionLog =>
  recordClose(openLog(), "completed", "2026-10-14T09:00:00.000Z");

const apiError = (status: number) => ({ status, message: "error" });

const failWith = (error: unknown) => async (): Promise<void> => {
  throw error;
};

describe("classifySyncError", () => {
  it("retries when there is no network, the server fails or the token is gone", () => {
    assert.equal(classifySyncError(apiError(0)), "retry");
    assert.equal(classifySyncError(apiError(503)), "retry");
    assert.equal(classifySyncError(apiError(401)), "retry");
    assert.equal(classifySyncError(new TypeError("Network request failed")), "retry");
  });

  it("stops when the server will not take the close as it is", () => {
    assert.equal(classifySyncError(apiError(400)), "conflict");
    assert.equal(classifySyncError(apiError(404)), "conflict");
    assert.equal(classifySyncError(apiError(409)), "conflict");
  });
});

describe("retryDelayMs", () => {
  it("doubles from 2 seconds up to one minute", () => {
    const delays = [1, 2, 3, 4, 5, 6, 7].map(retryDelayMs);

    assert.deepEqual(delays, [2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000]);
  });
});

describe("sendPendingClose", () => {
  it("sends nothing while the session is open", async () => {
    const sendThatMustNotRun = failWith(new Error("the open session was sent"));

    const outcome = await sendPendingClose(openLog(), sendThatMustNotRun);

    assert.equal(outcome, "nothing-to-send");
  });

  it("sends the close with every set to the right session", async () => {
    const outcome = await sendPendingClose(closedLog(), async (sessionId, request) => {
      assert.equal(sessionId, 7);
      assert.equal(request.completedAt, "2026-10-14T09:00:00.000Z");
      assert.equal(request.sets?.length, 1);
    });

    assert.equal(outcome, "sent");
  });

  it("asks to retry without network and stops on a conflict", async () => {
    assert.equal(await sendPendingClose(closedLog(), failWith(apiError(0))), "retry");
    assert.equal(await sendPendingClose(closedLog(), failWith(apiError(409))), "conflict");
  });
});
