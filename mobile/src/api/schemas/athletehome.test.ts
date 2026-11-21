import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { athleteHomeSchema, optionalAthleteCoachingSchema } from "./athletehome";

const COACHING = {
  coachName: "Luca Rossi",
  status: "expired",
  paidThrough: "2026-11-10",
  daysLeft: -3,
  pausedUntil: null,
};

const HOME_WITHOUT_COACHING = {
  noProgramReason: "no-coach",
  programs: [],
  today: null,
  week: [],
  nextWorkout: null,
  sessionsLast7Days: 0,
  lastSession: null,
  hasUnseenAssignment: false,
};

describe("athleteHomeSchema coaching", () => {
  it("reads the coaching of the home", () => {
    const home = athleteHomeSchema.parse({ ...HOME_WITHOUT_COACHING, coaching: COACHING });
    assert.deepEqual(home.coaching, COACHING);
  });

  it("turns an unknown status into null and still reads the rest of the home", () => {
    const home = athleteHomeSchema.parse({
      ...HOME_WITHOUT_COACHING,
      coaching: { ...COACHING, status: "on_hold" },
    });
    assert.equal(home.coaching, null);
    assert.equal(home.noProgramReason, "no-coach");
  });

  it("reads a backend without the field as null", () => {
    assert.equal(athleteHomeSchema.parse(HOME_WITHOUT_COACHING).coaching, null);
  });
});

describe("optionalAthleteCoachingSchema", () => {
  it("keeps null as null", () => {
    assert.equal(optionalAthleteCoachingSchema.parse(null), null);
  });

  it("turns a malformed value into null", () => {
    assert.equal(optionalAthleteCoachingSchema.parse({ ...COACHING, daysLeft: "3" }), null);
  });

  it("drops fields the contract does not have", () => {
    const parsed = optionalAthleteCoachingSchema.parse({ ...COACHING, agreedPriceCents: 8000 });
    assert.deepEqual(parsed, COACHING);
  });
});
