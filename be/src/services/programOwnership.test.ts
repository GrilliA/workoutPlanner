import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAthleteEditableProgram,
  isCoachAuthoredProgram,
} from "./programOwnership";

describe("programOwnership", () => {
  it("treats self-authored programs as editable", () => {
    assert.equal(
      isAthleteEditableProgram({ userId: 1, createdByUserId: 1 }, 1),
      true,
    );
    assert.equal(isCoachAuthoredProgram({ userId: 1, createdByUserId: 1 }), false);
  });

  it("treats coach-authored programs as read-only for athletes", () => {
    assert.equal(
      isAthleteEditableProgram({ userId: 1, createdByUserId: 9 }, 1),
      false,
    );
    assert.equal(isCoachAuthoredProgram({ userId: 1, createdByUserId: 9 }), true);
  });

  it("treats null createdByUserId as self-editable for the owner", () => {
    assert.equal(
      isAthleteEditableProgram({ userId: 1, createdByUserId: null }, 1),
      true,
    );
  });
});
