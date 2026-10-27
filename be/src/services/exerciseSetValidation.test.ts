import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateExerciseNotes, validateSetPrescriptions } from "./exerciseSetValidation";
import { MAX_SETS_PER_EXERCISE } from "./sessionValidation";

describe("validateSetPrescriptions", () => {
  it("fills the new fields with null and the rest with the workout default", () => {
    const parsed = validateSetPrescriptions([{ setNumber: 1, reps: 10 }], 90);

    assert.deepEqual(parsed, {
      ok: true,
      value: [
        {
          setNumber: 1,
          reps: 10,
          repsMax: null,
          loadValue: null,
          loadUnit: null,
          rir: null,
          restSec: 90,
        },
      ],
    });
  });

  it("keeps a rep range, a load and a target RIR", () => {
    const parsed = validateSetPrescriptions(
      [
        { setNumber: 1, reps: 8, repsMax: 12, loadValue: 75, loadUnit: "percent_1rm", rir: 2 },
        { setNumber: 2, reps: 5, loadValue: 102.5, loadUnit: "kg", restSec: 180 },
      ],
      90,
    );

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.value[0], {
        setNumber: 1,
        reps: 8,
        repsMax: 12,
        loadValue: 75,
        loadUnit: "percent_1rm",
        rir: 2,
        restSec: 90,
      });
      assert.equal(parsed.value[1].loadValue, 102.5);
      assert.equal(parsed.value[1].loadUnit, "kg");
    }
  });

  it("stores a range with equal ends as a single rep count", () => {
    const parsed = validateSetPrescriptions([{ setNumber: 1, reps: 10, repsMax: 10 }], 90);

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value[0].repsMax, null);
    }
  });

  it("rejects a range whose top is lower than reps", () => {
    const parsed = validateSetPrescriptions([{ setNumber: 1, reps: 12, repsMax: 8 }], 90);
    assert.equal(parsed.ok, false);
  });

  it("rejects a load without a unit and a unit without a load", () => {
    assert.equal(validateSetPrescriptions([{ setNumber: 1, reps: 5, loadValue: 80 }], 90).ok, false);
    assert.equal(validateSetPrescriptions([{ setNumber: 1, reps: 5, loadUnit: "kg" }], 90).ok, false);
  });

  it("rejects an unknown unit and a percentage over 100", () => {
    const unknownUnit = validateSetPrescriptions(
      [{ setNumber: 1, reps: 5, loadValue: 80, loadUnit: "lb" }],
      90,
    );
    const overMax = validateSetPrescriptions(
      [{ setNumber: 1, reps: 5, loadValue: 120, loadUnit: "percent_1rm" }],
      90,
    );

    assert.equal(unknownUnit.ok, false);
    assert.equal(overMax.ok, false);
  });

  it("rejects RIR outside 0–10 or not an integer", () => {
    assert.equal(validateSetPrescriptions([{ setNumber: 1, reps: 5, rir: 11 }], 90).ok, false);
    assert.equal(validateSetPrescriptions([{ setNumber: 1, reps: 5, rir: 1.5 }], 90).ok, false);
  });

  it("rejects duplicate and non-consecutive set numbers", () => {
    const duplicate = validateSetPrescriptions(
      [
        { setNumber: 1, reps: 5 },
        { setNumber: 1, reps: 5 },
      ],
      90,
    );
    const gap = validateSetPrescriptions(
      [
        { setNumber: 1, reps: 5 },
        { setNumber: 3, reps: 5 },
      ],
      90,
    );

    assert.equal(duplicate.ok, false);
    assert.equal(gap.ok, false);
  });

  it("accepts up to the per-exercise cap and rejects one set more", () => {
    const prescriptions = (count: number) =>
      Array.from({ length: count }, (_, index) => ({ setNumber: index + 1, reps: 5 }));

    assert.equal(validateSetPrescriptions(prescriptions(MAX_SETS_PER_EXERCISE), 90).ok, true);
    assert.deepEqual(validateSetPrescriptions(prescriptions(MAX_SETS_PER_EXERCISE + 1), 90), {
      ok: false,
      error: `setPrescriptions must have at most ${MAX_SETS_PER_EXERCISE} sets`,
    });
  });
});

describe("validateExerciseNotes", () => {
  it("trims the text and turns an empty note into null", () => {
    assert.deepEqual(validateExerciseNotes("  Fermo 1s in basso  "), {
      ok: true,
      value: "Fermo 1s in basso",
    });
    assert.deepEqual(validateExerciseNotes("   "), { ok: true, value: null });
    assert.deepEqual(validateExerciseNotes(undefined), { ok: true, value: null });
  });

  it("rejects notes that are too long or not text", () => {
    assert.equal(validateExerciseNotes("x".repeat(501)).ok, false);
    assert.equal(validateExerciseNotes(42).ok, false);
  });
});
