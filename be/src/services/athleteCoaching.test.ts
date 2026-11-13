import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { athleteCoachingFrom } from "./athleteCoaching";
import { subscriptionState, type PauseDates } from "./subscription";

const TODAY = "2026-11-13";
const COACH = { name: "Luca Rossi" };

const ATHLETE_COACHING_KEYS = ["coachName", "daysLeft", "paidThrough", "pausedUntil", "status"];

/** The detail as the coach route builds it, with the priced fields the athlete must not get. */
const detailFor = (input: {
  paidThrough: string;
  endedOn?: string | null;
  activePause?: PauseDates | null;
}) => ({
  subscription: {
    id: 7,
    agreedPriceCents: 8000,
    offerId: 3,
    paidThrough: input.paidThrough,
    endedOn: input.endedOn ?? null,
  },
  state: subscriptionState({
    paidThrough: input.paidThrough,
    endedOn: input.endedOn ?? null,
    today: TODAY,
    activePause: input.activePause ?? null,
  }),
});

describe("athleteCoachingFrom", () => {
  it("is null without a linked coach", () => {
    assert.equal(athleteCoachingFrom(null, detailFor({ paidThrough: "2026-12-13" })), null);
    assert.equal(athleteCoachingFrom(null, null), null);
  });

  it("is null when the current coach has no subscription for the athlete", () => {
    assert.equal(athleteCoachingFrom(COACH, { subscription: null, state: null }), null);
    assert.equal(athleteCoachingFrom(COACH, null), null);
  });

  it("copies the coach state: active", () => {
    assert.deepEqual(athleteCoachingFrom(COACH, detailFor({ paidThrough: "2026-12-13" })), {
      coachName: "Luca Rossi",
      status: "active",
      paidThrough: "2026-12-13",
      daysLeft: 30,
      pausedUntil: null,
    });
  });

  it("copies the coach state: expiring within 7 days", () => {
    const coaching = athleteCoachingFrom(COACH, detailFor({ paidThrough: "2026-11-20" }));
    assert.equal(coaching?.status, "expiring");
    assert.equal(coaching?.daysLeft, 7);
  });

  it("copies the coach state: expired, with negative days left", () => {
    const coaching = athleteCoachingFrom(COACH, detailFor({ paidThrough: "2026-11-10" }));
    assert.equal(coaching?.status, "expired");
    assert.equal(coaching?.daysLeft, -3);
    assert.equal(coaching?.pausedUntil, null);
  });

  it("copies the coach state: paused, with the end of the running pause", () => {
    const coaching = athleteCoachingFrom(
      COACH,
      detailFor({
        paidThrough: "2026-12-20",
        activePause: { startsOn: "2026-11-10", endsOn: "2026-11-24" },
      }),
    );
    assert.equal(coaching?.status, "paused");
    assert.equal(coaching?.pausedUntil, "2026-11-24");
  });

  it("copies the coach state: ended, also while the coach is still linked", () => {
    const coaching = athleteCoachingFrom(
      COACH,
      detailFor({ paidThrough: "2026-12-13", endedOn: "2026-11-13" }),
    );
    assert.equal(coaching?.status, "ended");
    assert.equal(coaching?.daysLeft, 30);
    assert.equal(coaching?.pausedUntil, null);
  });

  it("keeps a missing coach name as null", () => {
    const coaching = athleteCoachingFrom({ name: null }, detailFor({ paidThrough: "2026-12-13" }));
    assert.equal(coaching?.coachName, null);
  });

  it("never carries a price, an offer or an id", () => {
    const coaching = athleteCoachingFrom(COACH, detailFor({ paidThrough: "2026-12-13" }));
    assert.deepEqual(Object.keys(coaching ?? {}).sort(), ATHLETE_COACHING_KEYS);
  });
});
