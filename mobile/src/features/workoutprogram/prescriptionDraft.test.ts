import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  prescriptionsFromUniform,
  toSetPrescriptions,
  validatePrescriptionDrafts,
  cycleRestSec,
} from "./prescriptionDraft";

describe("prescriptionDraft", () => {
  it("builds variable prescriptions", () => {
    const drafts = prescriptionsFromUniform(3, 10, 90);
    drafts[1] = { ...drafts[1]!, reps: "8", restSec: 120 };
    const payload = toSetPrescriptions(drafts);
    assert.deepEqual(payload, [
      { setNumber: 1, reps: 10, restSec: 90 },
      { setNumber: 2, reps: 8, restSec: 120 },
      { setNumber: 3, reps: 10, restSec: 90 },
    ]);
  });

  it("validates empty and bad reps", () => {
    assert.equal(validatePrescriptionDrafts([]), "Aggiungi almeno una serie");
    assert.match(
      validatePrescriptionDrafts([{ key: "a", reps: "0", restSec: 90 }]) ?? "",
      /ripetizioni/i,
    );
  });

  it("cycles rest options", () => {
    assert.equal(cycleRestSec(90), 120);
    assert.equal(cycleRestSec(150), 60);
  });
});
