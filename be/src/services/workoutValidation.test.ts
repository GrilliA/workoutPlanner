import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateCreateWorkoutInput,
  validateUpdateWorkoutInput,
} from "./workoutValidation";

describe("validateUpdateWorkoutInput isActive", () => {
  it("accepts isActive boolean", () => {
    const parsed = validateUpdateWorkoutInput({ isActive: false });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.value, { isActive: false });
    }
  });

  it("rejects non-boolean isActive", () => {
    const parsed = validateUpdateWorkoutInput({ isActive: "no" });
    assert.equal(parsed.ok, false);
  });
});

describe("validateCreateWorkoutInput isActive", () => {
  it("defaults isActive to true", () => {
    const parsed = validateCreateWorkoutInput({ name: "Push" });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.isActive, true);
    }
  });
});
