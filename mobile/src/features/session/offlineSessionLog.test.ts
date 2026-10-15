import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkoutSessionWithSets } from "../../api/schemas";
import {
  acknowledgeWrite,
  createOfflineSessionLog,
  decodeOfflineSessionLog,
  encodeOfflineSessionLog,
  isSameSet,
  pendingWrites,
  recordClose,
  recordSet,
  removeSet,
  type OfflineSessionLog,
  type PendingWrite,
  type SetValues,
} from "./offlineSessionLog";

const benchSet1 = { exerciseId: 10, setNumber: 1 };
const squatSet1 = { exerciseId: 11, setNumber: 1 };

const values = (reps: number): SetValues => ({
  reps,
  weightKg: 60,
  rir: null,
  tutSec: null,
  loggedAt: "2026-10-14T08:10:00.000Z",
});

const serverSession = (
  sets: WorkoutSessionWithSets["sets"] = [],
): WorkoutSessionWithSets => ({
  id: 7,
  workoutId: 3,
  workoutDayId: 4,
  userId: 2,
  status: "in_progress",
  startedAt: new Date("2026-10-14T08:00:00.000Z"),
  completedAt: null,
  notes: null,
  sets,
});

const emptyLog = (): OfflineSessionLog =>
  createOfflineSessionLog(serverSession());

/** Pretend the server stored everything queued so far. */
function syncAll(log: OfflineSessionLog): OfflineSessionLog {
  let syncedLog = log;

  for (const write of pendingWrites(log)) {
    syncedLog = acknowledgeWrite(syncedLog, write);
  }

  return syncedLog;
}

function firstPendingWrite(log: OfflineSessionLog): PendingWrite {
  const [firstWrite] = pendingWrites(log);

  if (!firstWrite) {
    throw new Error("expected a pending write");
  }

  return firstWrite;
}

function upsertedReps(write: PendingWrite): number {
  if (write.kind !== "upsert") {
    throw new Error(`expected an upsert, got ${write.kind}`);
  }

  return write.values.reps;
}

const pendingKinds = (log: OfflineSessionLog): string[] =>
  pendingWrites(log).map((write) => write.kind);

const benchSetOnServer = (log: OfflineSessionLog): boolean | undefined =>
  log.sets.find((set) => isSameSet(set, benchSet1))?.onServer;

describe("createOfflineSessionLog", () => {
  it("starts with the server sets and nothing to send", () => {
    const log = createOfflineSessionLog(
      serverSession([
        {
          id: 1,
          sessionId: 7,
          exerciseId: 10,
          setNumber: 1,
          weightKg: 60,
          reps: 8,
          rir: null,
          tutSec: null,
          loggedAt: new Date("2026-10-14T08:05:00.000Z"),
        },
      ]),
    );

    assert.equal(benchSetOnServer(log), true);
    assert.equal(log.sets[0]?.loggedAt, "2026-10-14T08:05:00.000Z");
    assert.deepEqual(pendingWrites(log), []);
  });
});

describe("merging writes by set", () => {
  it("log then edit before sync sends one upsert with the last values", () => {
    let log = recordSet(emptyLog(), benchSet1, values(8));
    log = recordSet(log, benchSet1, values(10));

    assert.deepEqual(pendingKinds(log), ["upsert"]);
    assert.equal(upsertedReps(firstPendingWrite(log)), 10);
    assert.equal(log.sets.length, 1);
  });

  it("log then undo before sync sends nothing", () => {
    let log = recordSet(emptyLog(), benchSet1, values(8));
    log = removeSet(log, benchSet1);

    assert.deepEqual(pendingWrites(log), []);
    assert.deepEqual(log.sets, []);
  });

  it("undo after sync sends a delete", () => {
    let log = syncAll(recordSet(emptyLog(), benchSet1, values(8)));
    log = removeSet(log, benchSet1);

    assert.deepEqual(pendingKinds(log), ["delete"]);
  });

  it("logging again after an undo turns the delete back into an upsert", () => {
    let log = syncAll(recordSet(emptyLog(), benchSet1, values(8)));
    log = removeSet(log, benchSet1);
    log = recordSet(log, benchSet1, values(6));

    assert.deepEqual(pendingKinds(log), ["upsert"]);
    assert.equal(benchSetOnServer(log), true);
  });

  it("undo, log again and undo again still deletes the set on the server", () => {
    let log = syncAll(recordSet(emptyLog(), benchSet1, values(8)));
    log = removeSet(log, benchSet1);
    log = recordSet(log, benchSet1, values(6));
    log = removeSet(log, benchSet1);

    assert.deepEqual(pendingKinds(log), ["delete"]);
  });

  it("undo of a set that is not there changes nothing", () => {
    const log = emptyLog();

    assert.equal(removeSet(log, benchSet1), log);
  });
});

describe("pendingWrites", () => {
  it("sends sets in the order they were logged and the close last", () => {
    let log = recordSet(emptyLog(), squatSet1, values(8));
    log = recordSet(log, benchSet1, values(8));
    log = recordClose(log, "completed", "2026-10-14T09:00:00.000Z");

    const sentInOrder = pendingWrites(log).map((write) => {
      if (write.kind === "close") {
        return "close";
      }

      return `exercise ${write.exerciseId}`;
    });

    assert.deepEqual(sentInOrder, ["exercise 11", "exercise 10", "close"]);
  });

  it("takes no sets after the close", () => {
    let log = recordClose(emptyLog(), "completed", "2026-10-14T09:00:00.000Z");
    log = recordSet(log, benchSet1, values(8));

    assert.deepEqual(pendingKinds(log), ["close"]);
    assert.equal(log.status, "completed");
  });
});

describe("acknowledgeWrite", () => {
  it("drops the stored write and marks the set as on the server", () => {
    const log = recordSet(emptyLog(), benchSet1, values(8));
    const syncedLog = acknowledgeWrite(log, firstPendingWrite(log));

    assert.deepEqual(pendingWrites(syncedLog), []);
    assert.equal(benchSetOnServer(syncedLog), true);
  });

  it("keeps an edit made while the first write was on the way", () => {
    let log = recordSet(emptyLog(), benchSet1, values(8));
    const writeOnTheWay = firstPendingWrite(log);
    log = recordSet(log, benchSet1, values(10));
    log = acknowledgeWrite(log, writeOnTheWay);

    assert.deepEqual(pendingKinds(log), ["upsert"]);
    assert.equal(upsertedReps(firstPendingWrite(log)), 10);
    assert.equal(benchSetOnServer(log), true);
  });

  it("queues a delete when the set was undone while its upsert was on the way", () => {
    let log = recordSet(emptyLog(), benchSet1, values(8));
    const writeOnTheWay = firstPendingWrite(log);
    log = removeSet(log, benchSet1);
    log = acknowledgeWrite(log, writeOnTheWay);

    assert.deepEqual(pendingKinds(log), ["delete"]);
  });

  it("clears the close once the server stored it", () => {
    const log = recordClose(emptyLog(), "abandoned", "2026-10-14T09:00:00.000Z");
    const syncedLog = acknowledgeWrite(log, firstPendingWrite(log));

    assert.deepEqual(pendingWrites(syncedLog), []);
    assert.equal(syncedLog.status, "abandoned");
  });
});

describe("offline log on disk", () => {
  it("reads back what it wrote", () => {
    const log = recordClose(
      recordSet(emptyLog(), benchSet1, values(8)),
      "completed",
      "2026-10-14T09:00:00.000Z",
    );

    assert.deepEqual(decodeOfflineSessionLog(encodeOfflineSessionLog(log), 7), log);
  });

  it("ignores a log for another session, a half-written or a foreign file", () => {
    const text = encodeOfflineSessionLog(recordSet(emptyLog(), benchSet1, values(8)));

    assert.equal(decodeOfflineSessionLog(text, 8), null);
    assert.equal(decodeOfflineSessionLog(text.slice(0, text.length / 2), 7), null);
    assert.equal(decodeOfflineSessionLog(JSON.stringify({ version: 2 }), 7), null);
  });
});
