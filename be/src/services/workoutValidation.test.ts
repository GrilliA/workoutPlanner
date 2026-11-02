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

describe("validateWorkoutProgramInput prescription fields", () => {
  it("keeps notes and per-set range, load and RIR on each exercise", () => {
    const parsed = validateWorkoutProgramInput({
      name: "Forza",
      days: [
        {
          name: "A",
          sortOrder: 0,
          weekdays: [1],
          exercises: [
            {
              name: "Squat",
              notes: "Fermo 1s in buca",
              setPrescriptions: [
                { setNumber: 1, reps: 5, loadValue: 80, loadUnit: "percent_1rm", rir: 2, restSec: 180 },
                { setNumber: 2, reps: 8, repsMax: 10, loadValue: 100, loadUnit: "kg", restSec: 120 },
              ],
            },
          ],
        },
      ],
    });

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      const squat = parsed.value.days[0].exercises[0];
      assert.equal(squat.notes, "Fermo 1s in buca");
      assert.equal(squat.setPrescriptions[0].loadUnit, "percent_1rm");
      assert.equal(squat.setPrescriptions[0].rir, 2);
      assert.equal(squat.setPrescriptions[1].repsMax, 10);
      assert.equal(squat.setPrescriptions[1].loadValue, 100);
    }
  });

  it("rejects an exercise with an invalid load", () => {
    const parsed = validateWorkoutProgramInput({
      name: "Forza",
      days: [
        {
          name: "A",
          sortOrder: 0,
          weekdays: [1],
          exercises: [
            { name: "Squat", setPrescriptions: [{ setNumber: 1, reps: 5, loadValue: 80 }] },
          ],
        },
      ],
    });

    assert.equal(parsed.ok, false);
  });
});
