import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkoutSessionWithSets } from "../../api/schemas";
import {
  closeRequest,
  createOfflineSessionLog,
  decodeOfflineSessionLog,
  encodeOfflineSessionLog,
  recordClose,
  recordSet,
  removeSet,
  type OfflineSessionLog,
  type SetValues,
} from "./offlineSessionLog";

const benchSet1 = { exerciseId: 10, setNumber: 1 };
const benchSet2 = { exerciseId: 10, setNumber: 2 };
const closedAt = "2026-10-14T09:00:00.000Z";

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

const repsOf = (log: OfflineSessionLog): number[] =>
  log.sets.map((set) => set.reps);

describe("createOfflineSessionLog", () => {
  it("starts from the server sets with nothing to send", () => {
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

    assert.equal(log.sets[0]?.loggedAt, "2026-10-14T08:05:00.000Z");
    assert.equal(closeRequest(log), null);
  });
});

describe("recordSet and removeSet", () => {
  it("adds a new set at the end", () => {
    const afterFirst = recordSet(emptyLog(), benchSet1, values(8));
    const afterSecond = recordSet(afterFirst, benchSet2, values(6));

    assert.deepEqual(repsOf(afterSecond), [8, 6]);
  });

  it("changes a logged set in place", () => {
    const afterFirst = recordSet(emptyLog(), benchSet1, values(8));
    const afterSecond = recordSet(afterFirst, benchSet2, values(6));
    const afterEdit = recordSet(afterSecond, benchSet1, values(10));

    assert.deepEqual(repsOf(afterEdit), [10, 6]);
  });

  it("removes an undone set", () => {
    const afterLog = recordSet(emptyLog(), benchSet1, values(8));
    const afterUndo = removeSet(afterLog, benchSet1);

    assert.deepEqual(afterUndo.sets, []);
  });

  it("takes no sets after the close", () => {
    const afterClose = recordClose(emptyLog(), "completed", closedAt);
    const afterLateSet = recordSet(afterClose, benchSet1, values(8));

    assert.deepEqual(afterLateSet.sets, []);
    assert.equal(afterLateSet.status, "completed");
  });
});

describe("closeRequest", () => {
  it("sends every set with the close and the phone times", () => {
    const afterLog = recordSet(emptyLog(), benchSet1, values(8));
    const afterClose = recordClose(afterLog, "completed", closedAt);

    assert.deepEqual(closeRequest(afterClose), {
      status: "completed",
      completedAt: closedAt,
      sets: [{ ...benchSet1, ...values(8) }],
    });
  });

  it("sends no sets for an abandoned session", () => {
    const afterLog = recordSet(emptyLog(), benchSet1, values(8));
    const afterAbandon = recordClose(afterLog, "abandoned", closedAt);

    assert.deepEqual(closeRequest(afterAbandon), {
      status: "abandoned",
      completedAt: closedAt,
    });
  });

  it("has nothing to send while the session is open", () => {
    const afterLog = recordSet(emptyLog(), benchSet1, values(8));

    assert.equal(closeRequest(afterLog), null);
  });
});

describe("offline log on disk", () => {
  it("reads back what it wrote", () => {
    const afterLog = recordSet(emptyLog(), benchSet1, values(8));
    const afterClose = recordClose(afterLog, "completed", closedAt);
    const text = encodeOfflineSessionLog(afterClose);

    assert.deepEqual(decodeOfflineSessionLog(text), afterClose);
  });

  it("ignores a half-written or a foreign file", () => {
    const text = encodeOfflineSessionLog(emptyLog());

    assert.equal(decodeOfflineSessionLog(text.slice(0, text.length / 2)), null);
    assert.equal(decodeOfflineSessionLog(JSON.stringify({ version: 2 })), null);
  });
});
