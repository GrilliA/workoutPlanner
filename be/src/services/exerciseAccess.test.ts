import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseExerciseBody } from "./exerciseAccess";
import { MAX_SETS_PER_EXERCISE } from "./sessionValidation";

describe("parseExerciseBody with the old sets field", () => {
  it("turns sets up to the cap into that many prescriptions", () => {
    const parsed = parseExerciseBody({ name: "Squat", sets: MAX_SETS_PER_EXERCISE, reps: 5 }, 90);

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.setPrescriptions.length, MAX_SETS_PER_EXERCISE);
    }
  });

  it("rejects sets past the cap", () => {
    assert.deepEqual(
      parseExerciseBody({ name: "Squat", sets: MAX_SETS_PER_EXERCISE + 1, reps: 5 }, 90),
      { ok: false, error: `sets must be an integer between 1 and ${MAX_SETS_PER_EXERCISE}` },
    );
  });
});
