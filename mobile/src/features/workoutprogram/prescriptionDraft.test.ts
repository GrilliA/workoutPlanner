import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DraftPrescription } from "./prescriptionDraft";
import {
  copyPrescription,
  prescriptionsFromServer,
  prescriptionsFromUniform,
  toSetPrescriptions,
  validatePrescriptionDrafts,
} from "./prescriptionDraft";

const draftSet = (key: string, reps: string, restSec: number): DraftPrescription => ({
  key,
  reps,
  restSec,
  repsMax: null,
  loadValue: null,
  loadUnit: null,
  rir: null,
});

describe("prescriptionDraft", () => {
  it("builds variable prescriptions", () => {
    const drafts = prescriptionsFromUniform(3, 10, 90);
    drafts[1] = { ...drafts[1]!, reps: "8", restSec: 120 };
    const payload = toSetPrescriptions(drafts);
    assert.deepEqual(payload, [
      { setNumber: 1, reps: 10, repsMax: null, loadValue: null, loadUnit: null, rir: null, restSec: 90 },
      { setNumber: 2, reps: 8, repsMax: null, loadValue: null, loadUnit: null, rir: null, restSec: 120 },
      { setNumber: 3, reps: 10, repsMax: null, loadValue: null, loadUnit: null, rir: null, restSec: 90 },
    ]);
  });

  it("carries range, load and RIR from the server back into the payload", () => {
    const drafts = prescriptionsFromServer([
      { setNumber: 1, reps: 8, repsMax: 12, loadValue: 80, loadUnit: "kg", rir: 2, restSec: 90 },
    ]);
    const raisedReps = [{ ...drafts[0]!, reps: "12" }];

    assert.deepEqual(toSetPrescriptions(drafts), [
      { setNumber: 1, reps: 8, repsMax: 12, loadValue: 80, loadUnit: "kg", rir: 2, restSec: 90 },
    ]);
    assert.equal(toSetPrescriptions(raisedReps)[0]?.repsMax, null);
  });

  it("copies the previous set with its prescription for a new set", () => {
    const [source] = prescriptionsFromServer([
      { setNumber: 1, reps: 5, loadValue: 75, loadUnit: "percent_1rm", rir: 1, restSec: 150 },
    ]);
    const copy = copyPrescription(source!);

    assert.notEqual(copy.key, source!.key);
    assert.equal(copy.loadValue, 75);
    assert.equal(copy.rir, 1);
  });

  it("validates empty and bad reps", () => {
    assert.equal(validatePrescriptionDrafts([]), "Aggiungi almeno una serie");
    assert.match(
      validatePrescriptionDrafts([draftSet("a", "0", 90)]) ?? "",
      /ripetizioni/i,
    );
  });
});
