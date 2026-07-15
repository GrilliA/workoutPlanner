import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getRomeWeekday,
  parseScheduledDate,
  toRomeDateKey,
} from "./workoutSchedule";

describe("parseScheduledDate", () => {
  it("accepts YYYY-MM-DD strings", () => {
    assert.equal(parseScheduledDate("2026-07-15"), "2026-07-15");
  });

  it("rejects invalid values", () => {
    assert.equal(parseScheduledDate("15-07-2026"), null);
    assert.equal(parseScheduledDate(null), null);
  });
});

describe("getRomeWeekday", () => {
  it("maps Rome weekdays with Monday as zero", () => {
    assert.equal(getRomeWeekday(new Date("2026-07-13T12:00:00Z")), 0);
    assert.equal(getRomeWeekday(new Date("2026-07-19T12:00:00Z")), 6);
  });
});

describe("toRomeDateKey", () => {
  it("formats dates in the Europe/Rome calendar", () => {
    assert.equal(toRomeDateKey(new Date("2026-07-14T22:30:00Z")), "2026-07-15");
  });
});
