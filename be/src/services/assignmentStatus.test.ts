import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeAssignmentStatus,
  dayBefore,
  daysUntilExpiry,
  isActiveForStatus,
  isValidIsoDate,
  mergeAssignmentDates,
  planAssignmentCutover,
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

  it("steps dayBefore back across month and year boundaries", () => {
    assert.equal(dayBefore("2026-03-01"), "2026-02-28");
    assert.equal(dayBefore("2027-01-01"), "2026-12-31");
  });

  it("revokes active and scheduled rows when the incoming assignment starts today or earlier", () => {
    const plan = planAssignmentCutover({
      today: "2026-09-08",
      incoming: { startsAt: "2026-09-08", expiresAt: "2026-10-08" },
      rows: [
        {
          id: 1,
          startsAt: "2026-09-01",
          expiresAt: "2026-10-01",
        },
        {
          id: 2,
          startsAt: "2026-09-20",
          expiresAt: "2026-10-20",
        },
        {
          id: 3,
          startsAt: "2026-07-01",
          expiresAt: "2026-08-01",
        },
      ],
    });

    assert.deepEqual(plan.revokeIds, [1, 2]);
    assert.deepEqual(plan.truncate, []);
  });

  it("truncates an overlapping active row to the day before a future start", () => {
    const plan = planAssignmentCutover({
      today: "2026-09-08",
      incoming: { startsAt: "2026-09-18", expiresAt: "2026-10-18" },
      rows: [
        {
          id: 1,
          startsAt: "2026-09-08",
          expiresAt: "2026-10-08",
        },
      ],
    });

    assert.deepEqual(plan.revokeIds, []);
    assert.deepEqual(plan.truncate, [{ id: 1, expiresAt: "2026-09-17" }]);
  });

  it("leaves a non-overlapping active row untouched when the incoming assignment starts later", () => {
    const plan = planAssignmentCutover({
      today: "2026-09-08",
      incoming: { startsAt: "2026-09-18", expiresAt: "2026-10-18" },
      rows: [
        {
          id: 1,
          startsAt: "2026-08-01",
          expiresAt: "2026-09-10",
        },
      ],
    });

    assert.deepEqual(plan.revokeIds, []);
    assert.deepEqual(plan.truncate, []);
  });

  it("revokes a queued scheduled row when a future assignment is planned", () => {
    const plan = planAssignmentCutover({
      today: "2026-09-08",
      incoming: { startsAt: "2026-09-18", expiresAt: "2026-10-18" },
      rows: [
        {
          id: 1,
          startsAt: "2026-09-20",
          expiresAt: "2026-10-20",
        },
      ],
    });

    assert.deepEqual(plan.revokeIds, [1]);
    assert.deepEqual(plan.truncate, []);
  });

  it("revokes a row that starts on the incoming start day", () => {
    const plan = planAssignmentCutover({
      today: "2026-09-08",
      incoming: { startsAt: "2026-09-10", expiresAt: "2026-10-18" },
      rows: [
        {
          id: 1,
          startsAt: "2026-09-10",
          expiresAt: "2026-10-10",
        },
      ],
    });

    assert.deepEqual(plan.revokeIds, [1]);
    assert.deepEqual(plan.truncate, []);
  });
});
