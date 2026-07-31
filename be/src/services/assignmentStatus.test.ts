import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeAssignmentStatus,
  daysUntilExpiry,
  isActiveForStatus,
  isValidIsoDate,
  mergeAssignmentDates,
  todayInRome,
  validateAssignmentDates,
} from "./assignmentStatus";

describe("assignmentStatus", () => {
  it("validates ISO dates and range", () => {
    assert.equal(isValidIsoDate("2026-07-27"), true);
    assert.equal(isValidIsoDate("2026-13-01"), false);
    assert.equal(isValidIsoDate("2026-02-30"), false);
    assert.equal(isValidIsoDate("not-a-date"), false);

    const ok = validateAssignmentDates({
      startsAt: "2026-07-01",
      expiresAt: "2026-08-01",
    });
    assert.equal(ok.ok, true);

    const bad = validateAssignmentDates({
      startsAt: "2026-08-01",
      expiresAt: "2026-07-01",
    });
    assert.equal(bad.ok, false);
    if (!bad.ok) {
      assert.match(bad.error, /expiresAt/);
    }

    const sameDay = validateAssignmentDates({
      startsAt: "2026-07-15",
      expiresAt: "2026-07-15",
    });
    assert.equal(sameDay.ok, true);
  });

  it("rejects invalid request bodies", () => {
    assert.equal(validateAssignmentDates(null).ok, false);
    assert.equal(validateAssignmentDates("2026-07-01").ok, false);
    assert.equal(
      validateAssignmentDates({ startsAt: "2026-07-01" }).ok,
      false,
    );
    assert.equal(
      validateAssignmentDates({ expiresAt: "2026-07-01" }).ok,
      false,
    );
  });

  it("computes status from dates", () => {
    assert.equal(
      computeAssignmentStatus("2026-07-01", "2026-07-31", "2026-06-15"),
      "scheduled",
    );
    assert.equal(
      computeAssignmentStatus("2026-07-01", "2026-07-31", "2026-07-15"),
      "active",
    );
    assert.equal(
      computeAssignmentStatus("2026-07-01", "2026-07-31", "2026-08-01"),
      "expired",
    );
    assert.equal(
      computeAssignmentStatus("2026-07-01", "2026-07-31", "2026-07-15", true),
      "revoked",
    );
  });

  it("treats start and end dates as inclusive boundaries", () => {
    assert.equal(
      computeAssignmentStatus("2026-07-01", "2026-07-31", "2026-07-01"),
      "active",
    );
    assert.equal(
      computeAssignmentStatus("2026-07-01", "2026-07-31", "2026-07-31"),
      "active",
    );
  });

  it("maps active status to workout activation", () => {
    assert.equal(isActiveForStatus("active"), true);
    assert.equal(isActiveForStatus("scheduled"), false);
    assert.equal(isActiveForStatus("expired"), false);
    assert.equal(isActiveForStatus("revoked"), false);
  });

  it("merges partial date patches and re-validates", () => {
    const existing = { startsAt: "2026-07-01", expiresAt: "2026-07-31" };

    const extended = mergeAssignmentDates(existing, { expiresAt: "2026-08-15" });
    assert.equal(extended.ok, true);
    if (extended.ok) {
      assert.equal(extended.value.startsAt, "2026-07-01");
      assert.equal(extended.value.expiresAt, "2026-08-15");
    }

    const shifted = mergeAssignmentDates(existing, { startsAt: "2026-07-10" });
    assert.equal(shifted.ok, true);
    if (shifted.ok) {
      assert.equal(shifted.value.startsAt, "2026-07-10");
      assert.equal(shifted.value.expiresAt, "2026-07-31");
    }

    const invalid = mergeAssignmentDates(existing, { startsAt: "2026-08-01" });
    assert.equal(invalid.ok, false);
  });

  it("counts days until expiry", () => {
    assert.equal(daysUntilExpiry("2026-07-30", "2026-07-27"), 3);
    assert.equal(daysUntilExpiry("2026-07-27", "2026-07-27"), 0);
    assert.equal(daysUntilExpiry("2026-07-20", "2026-07-27"), -7);
  });

  it("formats today in Europe/Rome", () => {
    const noonUtc = new Date("2026-07-30T12:00:00Z");
    assert.equal(todayInRome(noonUtc), "2026-07-30");
  });
});
