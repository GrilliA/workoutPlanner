import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatExerciseMeta } from "./mapExerciseMeta.ts";

describe("formatExerciseMeta", () => {
  it("shows reps per set and one shared rest", () => {
    const meta = formatExerciseMeta(
      [
        { reps: 10, restSec: 90 },
        { reps: 8, restSec: 90 },
      ],
      90,
    );

    assert.equal(meta, "2 serie · 10 / 8 reps · 90s recupero");
  });

  it("shows a shared rep range, load and RIR once", () => {
    const set = { reps: 8, repsMax: 12, loadValue: 82.5, loadUnit: "kg" as const, rir: 2, restSec: 120 };
    const meta = formatExerciseMeta([set, set, set], 90);

    assert.equal(meta, "3 serie · 8–12 reps · 82,5 kg · RIR 2 · 120s recupero");
  });

  it("collapses different loads and RIR into a short label", () => {
    const meta = formatExerciseMeta(
      [
        { reps: 5, loadValue: 85, loadUnit: "percent_1rm", rir: 1, restSec: 180 },
        { reps: 8, loadValue: 70, loadUnit: "percent_1rm", rir: 3, restSec: 120 },
      ],
      90,
    );

    assert.equal(meta, "2 serie · 5 / 8 reps · carichi vari · RIR vari · recuperi vari");
  });

  it("shows a percentage load with its unit", () => {
    const meta = formatExerciseMeta(
      [{ reps: 5, loadValue: 75, loadUnit: "percent_1rm", restSec: null }],
      90,
    );

    assert.equal(meta, "1 serie · 5 reps · 75% 1RM · 90s recupero");
  });
});
