import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatWeightKg,
  getTargetSetCount,
  isExerciseComplete,
  resolveLogDefaults,
  stepReps,
  stepWeightKg,
} from "./logDefaults";
import type { Exercise, LoggedSet } from "../../api";

const exercise = (partial: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise => ({
  workoutId: 1,
  sets: null,
  reps: null,
  setPrescriptions: [],
  ...partial,
});

describe("stepWeightKg", () => {
  it("steps by 1.25 from empty", () => {
    assert.equal(stepWeightKg("", 1), "1.25");
    assert.equal(stepWeightKg("", -1), "0");
  });

  it("keeps two-decimal precision", () => {
    assert.equal(stepWeightKg("80", 1), "81.25");
    assert.equal(stepWeightKg("81.25", -1), "80");
  });
});

describe("stepReps", () => {
  it("floors at 1", () => {
    assert.equal(stepReps("1", -1), "1");
    assert.equal(stepReps("", 1), "1");
  });
});

describe("getTargetSetCount", () => {
  it("uses prescription length", () => {
    assert.equal(
      getTargetSetCount(
        exercise({
          id: 1,
          name: "Squat",
          setPrescriptions: [
            { setNumber: 1, reps: 10, restSec: 90 },
            { setNumber: 2, reps: 10, restSec: 90 },
            { setNumber: 3, reps: 10, restSec: 90 },
          ],
        }),
      ),
      3,
    );
  });
});

describe("isExerciseComplete", () => {
  it("is true when logged sets reach the plan", () => {
    const squat = exercise({
      id: 1,
      name: "Squat",
      setPrescriptions: [
        { setNumber: 1, reps: 10, restSec: 90 },
        { setNumber: 2, reps: 10, restSec: 90 },
      ],
    });
    assert.equal(isExerciseComplete(squat, 1), false);
    assert.equal(isExerciseComplete(squat, 2), true);
  });
});

describe("resolveLogDefaults", () => {
  it("keeps last weight and advances to next prescription reps", () => {
    const sets: LoggedSet[] = [
      {
        id: 1,
        sessionId: 1,
        exerciseId: 1,
        setNumber: 1,
        weightKg: 60,
        reps: 10,
        rir: null,
        tutSec: null,
        loggedAt: new Date(),
      },
    ];

    assert.deepEqual(
      resolveLogDefaults(
        exercise({
          id: 1,
          name: "Squat",
          setPrescriptions: [
            { setNumber: 1, reps: 10, restSec: 90 },
            { setNumber: 2, reps: 8, restSec: 120 },
            { setNumber: 3, reps: 8, restSec: 120 },
          ],
        }),
        sets,
      ),
      { weight: "60", reps: "8" },
    );
  });

  it("falls back to prescription reps without weight", () => {
    assert.deepEqual(
      resolveLogDefaults(
        exercise({
          id: 1,
          name: "Squat",
          setPrescriptions: [{ setNumber: 1, reps: 8, restSec: 90 }],
        }),
        [],
      ),
      { weight: "", reps: "8" },
    );
  });

  it("prefills weight from the previous session when nothing is logged yet", () => {
    const previous: LoggedSet[] = [
      {
        id: 10,
        sessionId: 2,
        exerciseId: 1,
        setNumber: 1,
        weightKg: 80,
        reps: 10,
        rir: null,
        tutSec: null,
        loggedAt: new Date(),
      },
      {
        id: 11,
        sessionId: 2,
        exerciseId: 1,
        setNumber: 2,
        weightKg: 82.5,
        reps: 8,
        rir: null,
        tutSec: null,
        loggedAt: new Date(),
      },
    ];

    assert.deepEqual(
      resolveLogDefaults(
        exercise({
          id: 1,
          name: "Squat",
          setPrescriptions: [
            { setNumber: 1, reps: 10, restSec: 90 },
            { setNumber: 2, reps: 8, restSec: 90 },
          ],
        }),
        [],
        previous,
      ),
      { weight: "80", reps: "10" },
    );
  });

  it("keeps this session's last weight over the previous session", () => {
    const previous: LoggedSet[] = [
      {
        id: 10,
        sessionId: 2,
        exerciseId: 1,
        setNumber: 1,
        weightKg: 80,
        reps: 10,
        rir: null,
        tutSec: null,
        loggedAt: new Date(),
      },
    ];
    const logged: LoggedSet[] = [
      {
        id: 1,
        sessionId: 1,
        exerciseId: 1,
        setNumber: 1,
        weightKg: 85,
        reps: 10,
        rir: null,
        tutSec: null,
        loggedAt: new Date(),
      },
    ];

    assert.deepEqual(
      resolveLogDefaults(
        exercise({
          id: 1,
          name: "Squat",
          setPrescriptions: [
            { setNumber: 1, reps: 10, restSec: 90 },
            { setNumber: 2, reps: 8, restSec: 90 },
          ],
        }),
        logged,
        previous,
      ),
      { weight: "85", reps: "8" },
    );
  });
});

describe("formatWeightKg", () => {
  it("avoids float noise", () => {
    assert.equal(formatWeightKg(1.25 * 3), "3.75");
  });
});
