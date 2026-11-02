import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coachClientDetailSchema, coachClientsSchema } from "./coach.ts";

// The two rows of the "Dopo" example in docs/contracts/pt-clienti.md.
const withSubscription = {
  id: 42,
  email: "giulia@example.com",
  name: "Giulia Rossi",
  createdAt: "2026-03-02T10:11:12.000Z",
  linkedAt: "2026-09-17T08:00:00.000Z",
  subscription: { status: "expiring", paidThrough: "2026-10-30", daysLeft: 4, pausedUntil: null },
  lastSessionOn: "2026-10-24",
  last14Days: { completedSessions: 5, expectedSessions: 6 },
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
