import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { churnRisk, daysWithoutSession } from "./churnRisk";

const today = "2026-10-27";

// Expected dates are written by hand, not with the code under test.
const regularActivity = {
  last14Days: { completedSessions: 6, expectedSessions: 6 },
  lastSessionOn: "2026-10-26",
  linkedOn: "2026-01-10",
  today,
};

const withSubscription = (status: "active" | "expiring" | "expired" | "paused" | "ended", daysLeft: number) => ({
  status,
  daysLeft,
});

describe("churnRisk", () => {
  it("1. a paused client has no risk, even with every condition true", () => {
    const risk = churnRisk({
      subscription: withSubscription("paused", -3),
      last14Days: { completedSessions: 0, expectedSessions: 6 },
      lastSessionOn: "2026-10-01",
      linkedOn: "2026-01-10",
      today,
    });

    assert.equal(risk, null);
  });

  it("2. without a subscription, 6 days without a session is no risk and 7 days is medium", () => {
    const sixDays = churnRisk({
      ...regularActivity,
      subscription: null,
      last14Days: { completedSessions: 1, expectedSessions: null },
      lastSessionOn: "2026-10-21",
    });
    const sevenDays = churnRisk({
      ...regularActivity,
      subscription: null,
      last14Days: { completedSessions: 1, expectedSessions: null },
      lastSessionOn: "2026-10-20",
    });

    assert.equal(sixDays, null);
    assert.deepEqual(sevenDays, {
      level: "medium",
      reasons: [{ kind: "no_recent_session", message: "Nessuna sessione da 7 giorni" }],
    });
  });

  it("3. active with 15 days left is no risk; 14 days left is medium", () => {
    const fifteenDays = churnRisk({ ...regularActivity, subscription: withSubscription("active", 15) });
    const fourteenDays = churnRisk({ ...regularActivity, subscription: withSubscription("active", 14) });

    assert.equal(fifteenDays, null);
    assert.deepEqual(fourteenDays, {
      level: "medium",
      reasons: [{ kind: "subscription_expiring", message: "Abbonamento in scadenza tra 14 giorni" }],
    });
  });

  it("4. expiring in 3 days with 2 sessions out of 6 is high", () => {
    const risk = churnRisk({
      ...regularActivity,
      subscription: withSubscription("expiring", 3),
      last14Days: { completedSessions: 2, expectedSessions: 6 },
    });

    assert.deepEqual(risk, {
      level: "high",
      reasons: [
        { kind: "subscription_expiring", message: "Abbonamento in scadenza tra 3 giorni" },
        { kind: "low_frequency", message: "2 sessioni su 6 negli ultimi 14 giorni" },
      ],
    });
  });

  it("5. 3 sessions out of 6 is not under half: only the subscription, medium", () => {
    const risk = churnRisk({
      ...regularActivity,
      subscription: withSubscription("expiring", 3),
      last14Days: { completedSessions: 3, expectedSessions: 6 },
    });

    assert.deepEqual(risk, {
      level: "medium",
      reasons: [{ kind: "subscription_expiring", message: "Abbonamento in scadenza tra 3 giorni" }],
    });
  });

  it("6. expired yesterday or 30 days ago with regular activity is medium", () => {
    const yesterday = churnRisk({ ...regularActivity, subscription: withSubscription("expired", -1) });
    const monthAgo = churnRisk({ ...regularActivity, subscription: withSubscription("expired", -30) });

    assert.deepEqual(yesterday, {
      level: "medium",
      reasons: [{ kind: "subscription_expired", message: "Abbonamento scaduto ieri" }],
    });
    assert.deepEqual(monthAgo, {
      level: "medium",
      reasons: [{ kind: "subscription_expired", message: "Abbonamento scaduto da 30 giorni" }],
    });
  });

  it("7. expired and no session for 9 days is high", () => {
    const risk = churnRisk({
      ...regularActivity,
      subscription: withSubscription("expired", -2),
      last14Days: { completedSessions: 0, expectedSessions: null },
      lastSessionOn: "2026-10-18",
    });

    assert.deepEqual(risk, {
      level: "high",
      reasons: [
        { kind: "subscription_expired", message: "Abbonamento scaduto da 2 giorni" },
        { kind: "no_recent_session", message: "Nessuna sessione da 9 giorni" },
      ],
    });
  });

  it("8. ended and no session for 9 days is medium, with no subscription reason", () => {
    const risk = churnRisk({
      ...regularActivity,
      subscription: withSubscription("ended", 3),
      last14Days: { completedSessions: 0, expectedSessions: null },
      lastSessionOn: "2026-10-18",
    });

    assert.deepEqual(risk, {
      level: "medium",
      reasons: [{ kind: "no_recent_session", message: "Nessuna sessione da 9 giorni" }],
    });
  });

  it("9. without a program only the days without a session count", () => {
    const tenDays = churnRisk({
      ...regularActivity,
      subscription: null,
      last14Days: { completedSessions: 0, expectedSessions: null },
      lastSessionOn: "2026-10-17",
    });
    const threeDays = churnRisk({
      ...regularActivity,
      subscription: null,
      last14Days: { completedSessions: 0, expectedSessions: null },
      lastSessionOn: "2026-10-24",
    });

    assert.deepEqual(tenDays, {
      level: "medium",
      reasons: [{ kind: "no_recent_session", message: "Nessuna sessione da 10 giorni" }],
    });
    assert.equal(threeDays, null);
  });

  it("10. a client who never trained counts from the day they linked", () => {
    const linkedSixDaysAgo = churnRisk({
      subscription: null,
      last14Days: { completedSessions: 0, expectedSessions: null },
      lastSessionOn: null,
      linkedOn: "2026-10-21",
      today,
    });
    const linkedSevenDaysAgo = churnRisk({
      subscription: null,
      last14Days: { completedSessions: 0, expectedSessions: null },
      lastSessionOn: null,
      linkedOn: "2026-10-20",
      today,
    });

    assert.equal(linkedSixDaysAgo, null);
    assert.deepEqual(linkedSevenDaysAgo, {
      level: "medium",
      reasons: [
        { kind: "no_recent_session", message: "Nessuna sessione da quando è cliente (7 giorni)" },
      ],
    });
  });

  it("10. sessions before the link do not count: the days start from the link", () => {
    const withoutSubscription = {
      subscription: null,
      last14Days: { completedSessions: 0, expectedSessions: null },
      lastSessionOn: "2026-09-01",
      today,
    };
    const linkedSixDaysAgo = churnRisk({ ...withoutSubscription, linkedOn: "2026-10-21" });
    const linkedSevenDaysAgo = churnRisk({ ...withoutSubscription, linkedOn: "2026-10-20" });
    const trainedOnTheLinkDay = churnRisk({
      ...withoutSubscription,
      lastSessionOn: "2026-10-18",
      linkedOn: "2026-10-18",
    });

    assert.equal(linkedSixDaysAgo, null);
    assert.deepEqual(linkedSevenDaysAgo?.reasons, [
      { kind: "no_recent_session", message: "Nessuna sessione da quando è cliente (7 giorni)" },
    ]);
    assert.deepEqual(trainedOnTheLinkDay?.reasons, [
      { kind: "no_recent_session", message: "Nessuna sessione da 9 giorni" },
    ]);
  });

  it("11. low frequency and no recent session without the subscription are one condition: medium", () => {
    const risk = churnRisk({
      ...regularActivity,
      subscription: withSubscription("active", 40),
      last14Days: { completedSessions: 1, expectedSessions: 6 },
      lastSessionOn: "2026-10-15",
    });

    assert.deepEqual(risk, {
      level: "medium",
      reasons: [
        { kind: "low_frequency", message: "1 sessione su 6 negli ultimi 14 giorni" },
        { kind: "no_recent_session", message: "Nessuna sessione da 12 giorni" },
      ],
    });
  });

  it("12. messages: due today, due tomorrow, one session in the singular, zero in the plural", () => {
    const dueToday = churnRisk({ ...regularActivity, subscription: withSubscription("expiring", 0) });
    const dueTomorrow = churnRisk({ ...regularActivity, subscription: withSubscription("expiring", 1) });
    const oneSession = churnRisk({
      ...regularActivity,
      subscription: null,
      last14Days: { completedSessions: 1, expectedSessions: 6 },
    });
    const noSession = churnRisk({
      ...regularActivity,
      subscription: null,
      last14Days: { completedSessions: 0, expectedSessions: 6 },
    });

    assert.deepEqual(dueToday?.reasons, [
      { kind: "subscription_expiring", message: "Abbonamento in scadenza oggi" },
    ]);
    assert.deepEqual(dueTomorrow?.reasons, [
      { kind: "subscription_expiring", message: "Abbonamento in scadenza domani" },
    ]);
    assert.deepEqual(oneSession?.reasons, [
      { kind: "low_frequency", message: "1 sessione su 6 negli ultimi 14 giorni" },
    ]);
    assert.deepEqual(noSession?.reasons, [
      { kind: "low_frequency", message: "0 sessioni su 6 negli ultimi 14 giorni" },
    ]);
  });
});

describe("daysWithoutSession", () => {
  it("counts from the last session or the link, whichever is later", () => {
    const linkedOn = "2026-10-20";

    assert.equal(daysWithoutSession({ lastSessionOn: "2026-10-24", linkedOn, today }), 3);
    assert.equal(daysWithoutSession({ lastSessionOn: "2026-10-20", linkedOn, today }), 7);
    assert.equal(daysWithoutSession({ lastSessionOn: "2026-09-01", linkedOn, today }), 7);
    assert.equal(daysWithoutSession({ lastSessionOn: null, linkedOn, today }), 7);
  });
});
