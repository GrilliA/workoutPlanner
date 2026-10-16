import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSetTargetExtras,
  formatTargetRepsForSet,
  formatWeightKg,
  getTargetRirForSet,
  getTargetSetCount,
  isExerciseComplete,
  isValidRir,
  resolveLogDefaults,
  stepReps,
  stepRir,
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

describe("stepRir", () => {
  it("starts at 0 from empty and clears below 0", () => {
    assert.equal(stepRir("", 1), "0");
    assert.equal(stepRir("", -1), "");
    assert.equal(stepRir("0", -1), "");
    assert.equal(stepRir("2", 1), "3");
  });

  it("stops at 10", () => {
    assert.equal(stepRir("10", 1), "10");
  });
});

describe("isValidRir", () => {
  it("takes whole numbers from 0 to 10", () => {
    assert.equal(isValidRir(0), true);
    assert.equal(isValidRir(10), true);
    assert.equal(isValidRir(11), false);
    assert.equal(isValidRir(-1), false);
    assert.equal(isValidRir(1.5), false);
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
      { weight: "60", reps: "8", rir: "" },
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
      { weight: "", reps: "8", rir: "" },
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
      { weight: "80", reps: "10", rir: "" },
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
      { weight: "85", reps: "8", rir: "" },
    );
  });
});

describe("formatWeightKg", () => {
  it("avoids float noise", () => {
    assert.equal(formatWeightKg(1.25 * 3), "3.75");
  });
});

describe("prescription targets", () => {
  const squat = exercise({
    id: 1,
    name: "Squat",
    setPrescriptions: [
      { setNumber: 1, reps: 8, repsMax: 12, loadValue: 82.5, loadUnit: "kg", rir: 2, restSec: 90 },
      { setNumber: 2, reps: 5, loadValue: 75, loadUnit: "percent_1rm", restSec: 120 },
      { setNumber: 3, reps: 10, restSec: 90 },
    ],
  });

  it("formats the rep range and the extras of each set", () => {
    assert.equal(formatTargetRepsForSet(squat, 1), "8–12");
    assert.equal(formatTargetRepsForSet(squat, 2), "5");
    assert.equal(formatSetTargetExtras(squat, 1), "82,5 kg · RIR 2");
    assert.equal(formatSetTargetExtras(squat, 2), "75% 1RM");
    assert.equal(formatSetTargetExtras(squat, 3), null);
  });

  it("prefills the prescribed kg load when there is no history", () => {
    assert.deepEqual(resolveLogDefaults(squat, []), { weight: "82.5", reps: "8", rir: "2" });
  });

  it("does not turn a %1RM load into a weight, nor override a set logged without weight", () => {
    const loggedBodyweight = [
      { exerciseId: 1, setNumber: 1, weightKg: null, reps: 8, rir: null, tutSec: null },
    ];
    const percentOnly = exercise({
      id: 2,
      name: "Panca",
      setPrescriptions: [{ setNumber: 1, reps: 5, loadValue: 75, loadUnit: "percent_1rm", restSec: 90 }],
    });

    assert.deepEqual(resolveLogDefaults(percentOnly, []), { weight: "", reps: "5", rir: "" });
    assert.equal(resolveLogDefaults(squat, loggedBodyweight).weight, "");
  });

  it("prefills the RIR the coach asked for on the next set", () => {
    const loggedFirstSet = [
      { exerciseId: 1, setNumber: 1, weightKg: 82.5, reps: 8, rir: 3, tutSec: null },
    ];

    assert.equal(getTargetRirForSet(squat, 1), 2);
    assert.equal(getTargetRirForSet(squat, 2), null);
    assert.equal(resolveLogDefaults(squat, loggedFirstSet).rir, "");
  });
});
