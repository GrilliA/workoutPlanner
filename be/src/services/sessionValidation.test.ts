import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampToSessionWindow,
  MAX_SETS_PER_EXERCISE,
  MAX_SETS_PER_SESSION,
  validateLogSetInput,
  validatePatchSessionInput,
} from "./sessionValidation";

describe("validatePatchSessionInput", () => {
  it("accepts completed without sets", () => {
    const parsed = validatePatchSessionInput({ status: "completed" });

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.value, { status: "completed" });
    }
  });

  it("accepts abandoned without sets", () => {
    const parsed = validatePatchSessionInput({ status: "abandoned" });

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.value, { status: "abandoned" });
    }
  });

  it("accepts completed with a sets flush payload", () => {
    const parsed = validatePatchSessionInput({
      status: "completed",
      sets: [
        {
          exerciseId: 1,
          setNumber: 1,
          reps: 8,
          weightKg: 100,
          loggedAt: "2026-10-14T08:10:00.000Z",
        },
        { exerciseId: 1, setNumber: 2, reps: 6, weightKg: null },
      ],
    });

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.status, "completed");
      assert.equal(parsed.value.sets?.length, 2);
      assert.deepEqual(parsed.value.sets?.[0], {
        exerciseId: 1,
        setNumber: 1,
        reps: 8,
        weightKg: 100,
        rir: null,
        tutSec: null,
        loggedAt: new Date("2026-10-14T08:10:00.000Z"),
      });
      assert.equal(parsed.value.sets?.[1]?.loggedAt, null);
    }
  });

  it("rejects a set whose loggedAt is not a date-time", () => {
    const parsed = validatePatchSessionInput({
      status: "completed",
      sets: [{ exerciseId: 1, setNumber: 1, reps: 8, loggedAt: "ieri" }],
    });

    assert.deepEqual(parsed, {
      ok: false,
      error: "loggedAt must be an ISO date-time string",
    });
  });

  it("rejects sets when abandoning", () => {
    const parsed = validatePatchSessionInput({
      status: "abandoned",
      sets: [{ exerciseId: 1, setNumber: 1, reps: 5 }],
    });

    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.match(parsed.error, /sets are not allowed/);
    }
  });

  it("rejects duplicate exerciseId and setNumber pairs", () => {
    const parsed = validatePatchSessionInput({
      status: "completed",
      sets: [
        { exerciseId: 1, setNumber: 1, reps: 8 },
        { exerciseId: 1, setNumber: 1, reps: 7 },
      ],
    });

    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.match(parsed.error, /duplicate/);
    }
  });

  it("rejects invalid set entries", () => {
    const parsed = validatePatchSessionInput({
      status: "completed",
      sets: [{ exerciseId: 1, setNumber: 1, reps: 0 }],
    });

    assert.equal(parsed.ok, false);
  });

  it("leaves out sets past the setNumber cap instead of refusing the close", () => {
    const parsed = validatePatchSessionInput({
      status: "completed",
      sets: [
        { exerciseId: 1, setNumber: MAX_SETS_PER_EXERCISE, reps: 8 },
        { exerciseId: 1, setNumber: MAX_SETS_PER_EXERCISE + 1, reps: 8 },
        { exerciseId: 1, setNumber: 2147483648, reps: 0 },
      ],
    });

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(
        parsed.value.sets?.map((set) => set.setNumber),
        [MAX_SETS_PER_EXERCISE],
      );
    }
  });

  it("keeps the sets logged first when the close is past the session cap", () => {
    const firstTime = Date.parse("2026-10-14T08:00:00.000Z");
    const sets = Array.from({ length: MAX_SETS_PER_SESSION + 1 }, (_, index) => ({
      exerciseId: index + 1,
      setNumber: 1,
      reps: 8,
      // The first set has no time from the phone: it is stored at the close, so it goes last.
      loggedAt: index === 0 ? null : new Date(firstTime + index * 1000).toISOString(),
    }));

    const parsed = validatePatchSessionInput({ status: "completed", sets });

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      const keptExerciseIds = parsed.value.sets?.map((set) => set.exerciseId) ?? [];

      assert.equal(keptExerciseIds.length, MAX_SETS_PER_SESSION);
      assert.equal(keptExerciseIds.includes(1), false);
      assert.equal(keptExerciseIds[0], 2);
    }
  });
});

describe("validateLogSetInput", () => {
  it("accepts the last set number under the cap", () => {
    const parsed = validateLogSetInput({
      exerciseId: 1,
      setNumber: MAX_SETS_PER_EXERCISE,
      reps: 8,
    });

    assert.equal(parsed.ok, true);
  });

  it("rejects a set number past the cap", () => {
    const parsed = validateLogSetInput({
      exerciseId: 1,
      setNumber: MAX_SETS_PER_EXERCISE + 1,
      reps: 8,
    });

    assert.deepEqual(parsed, {
      ok: false,
      error: `setNumber must be an integer between 1 and ${MAX_SETS_PER_EXERCISE}`,
    });
  });
});

describe("clampToSessionWindow", () => {
  const startedAt = new Date("2026-10-14T08:00:00.000Z");
  const now = new Date("2026-10-14T09:00:00.000Z");

  it("uses now when the phone sends no time", () => {
    const parsed = clampToSessionWindow("loggedAt", undefined, startedAt, now);

    assert.deepEqual(parsed, { ok: true, value: now });
  });

  it("keeps a time inside the session", () => {
    const parsed = clampToSessionWindow("loggedAt", "2026-10-14T08:30:00.000Z", startedAt, now);

    assert.deepEqual(parsed, {
      ok: true,
      value: new Date("2026-10-14T08:30:00.000Z"),
    });
  });

  it("moves a time before the start up to the start", () => {
    const parsed = clampToSessionWindow("loggedAt", "2026-10-13T08:30:00.000Z", startedAt, now);

    assert.deepEqual(parsed, { ok: true, value: startedAt });
  });

  it("moves a future time back to now", () => {
    const parsed = clampToSessionWindow("loggedAt", "2026-10-15T08:30:00.000Z", startedAt, now);

    assert.deepEqual(parsed, { ok: true, value: now });
  });

  it("rejects values that are not a date-time string", () => {
    assert.equal(clampToSessionWindow("loggedAt", "ieri", startedAt, now).ok, false);
    assert.equal(clampToSessionWindow("loggedAt", 1760432400000, startedAt, now).ok, false);
  });

  it("names the field in the error", () => {
    assert.deepEqual(clampToSessionWindow("completedAt", "ieri", startedAt, now), {
      ok: false,
      error: "completedAt must be an ISO date-time string",
    });
  });
});
