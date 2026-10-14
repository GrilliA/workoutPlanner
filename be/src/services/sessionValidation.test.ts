import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampLoggedAt, validatePatchSessionInput } from "./sessionValidation";

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
        { exerciseId: 1, setNumber: 1, reps: 8, weightKg: 100 },
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
      });
    }
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
});

describe("clampLoggedAt", () => {
  const startedAt = new Date("2026-10-14T08:00:00.000Z");
  const now = new Date("2026-10-14T09:00:00.000Z");

  it("uses now when the phone sends no time", () => {
    const parsed = clampLoggedAt(undefined, startedAt, now);

    assert.deepEqual(parsed, { ok: true, value: now });
  });

  it("keeps a time inside the session", () => {
    const parsed = clampLoggedAt("2026-10-14T08:30:00.000Z", startedAt, now);

    assert.deepEqual(parsed, {
      ok: true,
      value: new Date("2026-10-14T08:30:00.000Z"),
    });
  });

  it("moves a time before the start up to the start", () => {
    const parsed = clampLoggedAt("2026-10-13T08:30:00.000Z", startedAt, now);

    assert.deepEqual(parsed, { ok: true, value: startedAt });
  });

  it("moves a future time back to now", () => {
    const parsed = clampLoggedAt("2026-10-15T08:30:00.000Z", startedAt, now);

    assert.deepEqual(parsed, { ok: true, value: now });
  });

  it("rejects values that are not a date-time string", () => {
    assert.equal(clampLoggedAt("ieri", startedAt, now).ok, false);
    assert.equal(clampLoggedAt(1760432400000, startedAt, now).ok, false);
  });
});
