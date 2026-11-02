import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coachClientDetailSchema, coachClientsSchema, coachTodaySchema } from "./coach.ts";

// The two rows of the "Dopo" example in docs/contracts/pt-clienti.md, with the R5 `risk`
// (docs/contracts/pt-oggi.md) their data gives on 2026-10-27.
const withSubscription = {
  id: 42,
  email: "giulia@example.com",
  name: "Giulia Rossi",
  createdAt: "2026-03-02T10:11:12.000Z",
  linkedAt: "2026-09-17T08:00:00.000Z",
  subscription: { status: "expiring", paidThrough: "2026-10-30", daysLeft: 4, pausedUntil: null },
  lastSessionOn: "2026-10-24",
  last14Days: { completedSessions: 5, expectedSessions: 6 },
  risk: {
    level: "medium",
    reasons: [{ kind: "subscription_expiring", message: "Abbonamento in scadenza tra 4 giorni" }],
  },
};

const withoutSubscription = {
  id: 57,
  email: "marco@example.com",
  name: null,
  createdAt: "2026-10-20T09:00:00.000Z",
  linkedAt: "2026-10-21T09:00:00.000Z",
  subscription: null,
  lastSessionOn: null,
  last14Days: { completedSessions: 0, expectedSessions: null },
  risk: null,
};

describe("coachClientsSchema", () => {
  it("reads the contract example", () => {
    const clients = coachClientsSchema.parse([withSubscription, withoutSubscription]);

    assert.deepEqual(clients, [withSubscription, withoutSubscription]);
  });

  it("reads a paused subscription with the end of its pause", () => {
    const paused = {
      ...withSubscription,
      subscription: { status: "paused", paidThrough: "2026-12-17", daysLeft: 52, pausedUntil: "2026-11-30" },
    };
    const [client] = coachClientsSchema.parse([paused]);

    assert.equal(client.subscription?.pausedUntil, "2026-11-30");
  });

  it("refuses the list of an API that does not send the R4 fields yet", () => {
    const beforeR4 = {
      id: 42,
      email: "giulia@example.com",
      name: "Giulia Rossi",
      createdAt: "2026-03-02T10:11:12.000Z",
      linkedAt: "2026-09-17T08:00:00.000Z",
    };

    assert.equal(coachClientsSchema.safeParse([beforeR4]).success, false);
  });

  it("reads the R5 example with a high risk", () => {
    const giulia = {
      ...withSubscription,
      subscription: { status: "expiring", paidThrough: "2026-10-30", daysLeft: 3, pausedUntil: null },
      last14Days: { completedSessions: 2, expectedSessions: 6 },
      risk: {
        level: "high",
        reasons: [
          { kind: "subscription_expiring", message: "Abbonamento in scadenza tra 3 giorni" },
          { kind: "low_frequency", message: "2 sessioni su 6 negli ultimi 14 giorni" },
        ],
      },
    };
    const [client] = coachClientsSchema.parse([giulia]);

    assert.deepEqual(
      client.risk?.reasons.map((reason) => reason.kind),
      ["subscription_expiring", "low_frequency"],
    );
  });

  it("refuses the list of an API that does not send the R5 risk yet", () => {
    const beforeR5 = {
      id: 42,
      email: "giulia@example.com",
      name: "Giulia Rossi",
      createdAt: "2026-03-02T10:11:12.000Z",
      linkedAt: "2026-09-17T08:00:00.000Z",
      subscription: withSubscription.subscription,
      lastSessionOn: "2026-10-24",
      last14Days: { completedSessions: 5, expectedSessions: 6 },
    };

    assert.equal(coachClientsSchema.safeParse([beforeR5]).success, false);
  });

  it("refuses a risk level or a reason kind outside the contract", () => {
    const lowRisk = { ...withSubscription, risk: { ...withSubscription.risk, level: "low" } };
    const paymentReason = {
      ...withSubscription,
      risk: { level: "medium", reasons: [{ kind: "payment_due", message: "Deve pagare" }] },
    };

    assert.equal(coachClientsSchema.safeParse([lowRisk]).success, false);
    assert.equal(coachClientsSchema.safeParse([paymentReason]).success, false);
  });

  it("refuses a status outside the contract and a subscription without paidThrough", () => {
    const lateStatus = { ...withSubscription, subscription: { ...withSubscription.subscription, status: "late" } };
    const withoutPaidThrough = { status: "expiring", daysLeft: 4, pausedUntil: null };

    assert.equal(coachClientsSchema.safeParse([lateStatus]).success, false);
    assert.equal(
      coachClientsSchema.safeParse([{ ...withSubscription, subscription: withoutPaidThrough }]).success,
      false,
    );
  });
});

describe("coachClientDetailSchema", () => {
  it("keeps the detail client without the list fields", () => {
    const detail = coachClientDetailSchema.parse({
      client: withSubscription,
      assignments: [],
    });

    assert.deepEqual(Object.keys(detail.client), ["id", "email", "name", "createdAt", "linkedAt"]);
  });
});

// The example of GET /coach/today in docs/contracts/pt-oggi.md (today = 2026-10-27).
const todayExample = {
  clientCount: 12,
  handledCount: 1,
  items: [
    {
      athleteId: 42,
      athleteName: "Giulia Rossi",
      athleteEmail: "giulia@example.com",
      severity: "high",
      risk: {
        level: "high",
        reasons: [
          { kind: "subscription_expiring", message: "Abbonamento in scadenza tra 3 giorni" },
          { kind: "low_frequency", message: "2 sessioni su 6 negli ultimi 14 giorni" },
        ],
      },
      alerts: [{ kind: "program_expiring", message: "Scheda in scadenza tra 5 giorni" }],
      subscription: { status: "expiring", paidThrough: "2026-10-30", daysLeft: 3, pausedUntil: null },
    },
    {
      athleteId: 57,
      athleteName: "Marco Bianchi",
      athleteEmail: "marco@example.com",
      severity: "medium",
      risk: {
        level: "medium",
        reasons: [{ kind: "subscription_expired", message: "Abbonamento scaduto da 4 giorni" }],
      },
      alerts: [],
      subscription: { status: "expired", paidThrough: "2026-10-23", daysLeft: -4, pausedUntil: null },
    },
    {
      athleteId: 61,
      athleteName: null,
      athleteEmail: "luca@example.com",
      severity: "medium",
      risk: {
        level: "medium",
        reasons: [{ kind: "no_recent_session", message: "Nessuna sessione da quando è cliente (9 giorni)" }],
      },
      alerts: [],
      subscription: null,
    },
    {
      athleteId: 70,
      athleteName: "Sara Verdi",
      athleteEmail: "sara@example.com",
      severity: "low",
      risk: null,
      alerts: [{ kind: "personal_records", message: "Nuovi record: Panca piana, Squat" }],
      subscription: { status: "active", paidThrough: "2026-12-15", daysLeft: 49, pausedUntil: null },
    },
  ],
  recentActivity: [
    {
      sessionId: 901,
      athleteId: 70,
      athleteName: "Sara Verdi",
      athleteEmail: "sara@example.com",
      workoutId: 33,
      workoutName: "Forza A",
      completedAt: "2026-10-26T17:42:10.000Z",
    },
  ],
};

describe("coachTodaySchema", () => {
  it("reads the contract example as it is", () => {
    assert.deepEqual(coachTodaySchema.parse(todayExample), todayExample);
  });

  it("reads the empty answer of a coach without clients", () => {
    const empty = { clientCount: 0, handledCount: 0, items: [], recentActivity: [] };

    assert.deepEqual(coachTodaySchema.parse(empty), empty);
  });

  it("refuses a severity or an alert kind outside the contract", () => {
    const [giulia, ...others] = todayExample.items;
    const infoSeverity = { ...giulia, severity: "info" };
    const inactiveAlert = { ...giulia, alerts: [{ kind: "inactive", message: "Inattivo" }] };

    assert.equal(coachTodaySchema.safeParse({ ...todayExample, items: [infoSeverity, ...others] }).success, false);
    assert.equal(coachTodaySchema.safeParse({ ...todayExample, items: [inactiveAlert, ...others] }).success, false);
  });

  it("refuses an answer without the handled count", () => {
    const withoutHandledCount = {
      clientCount: todayExample.clientCount,
      items: todayExample.items,
      recentActivity: todayExample.recentActivity,
    };

    assert.equal(coachTodaySchema.safeParse(withoutHandledCount).success, false);
  });
});
