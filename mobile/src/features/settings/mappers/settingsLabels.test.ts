import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatInitials } from "../../../utils/initials";
import { formatCoachName } from "./settingsLabels";

const coach = (name: string | null) => ({
  coachId: 2,
  email: "luca@example.com",
  name,
  linkedAt: "2026-09-01",
});

describe("formatCoachName", () => {
  it("shortens the last name", () => {
    assert.equal(formatCoachName(coach("Luca Rossi")), "Luca R.");
  });

  it("falls back to the email without a name", () => {
    assert.equal(formatCoachName(coach(null)), "luca@example.com");
    assert.equal(formatCoachName(coach("Luca")), "Luca");
  });
});

describe("formatInitials", () => {
  it("takes up to two initials", () => {
    assert.equal(formatInitials("marco bianchi"), "MB");
    assert.equal(formatInitials(""), "?");
  });
});
