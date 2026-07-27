import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateWorkoutProgramInput } from "./workoutProgram";
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
  it("omits isActive when not provided", () => {
    const parsed = validateCreateWorkoutInput({ name: "Push" });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.isActive, undefined);
    }
  });

  it("keeps explicit isActive false", () => {
    const parsed = validateCreateWorkoutInput({ name: "Push", isActive: false });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.isActive, false);
    }
  });
});

describe("validateWorkoutProgramInput isActive", () => {
  const day = {
    name: "A",
    sortOrder: 0,
    weekdays: [1],
    exercises: [{ name: "Bench", sets: 3, reps: 10 }],
  };

  it("forwards explicit isActive into program input", () => {
    const parsed = validateWorkoutProgramInput({
      name: "Push",
      isActive: false,
      days: [day],
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.isActive, false);
    }
  });

  it("omits isActive when not provided so updates do not reactivate", () => {
    const parsed = validateWorkoutProgramInput({
      name: "Push",
      days: [day],
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.isActive, undefined);
    }
  });
});
