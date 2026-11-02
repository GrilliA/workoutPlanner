import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoachClientListItem } from "../../../../api/schemas/coach.ts";
import {
  CLIENT_FILTERS,
  clientFilterFromSearch,
  filterClients,
  formatClientStatus,
  formatTrainingFrequency,
  searchForClientFilter,
} from "./clientList.ts";

type Subscription = NonNullable<CoachClientListItem["subscription"]>;

const subscription = (status: Subscription["status"]): Subscription => ({
  status,
  paidThrough: "2026-10-30",
  daysLeft: 4,
  pausedUntil: null,
});

const client = (id: number, clientSubscription: Subscription | null): CoachClientListItem => ({
  id,
  email: `cliente${id}@example.com`,
  name: null,
  createdAt: "2026-03-02T10:11:12.000Z",
  linkedAt: "2026-09-17T08:00:00.000Z",
  subscription: clientSubscription,
  lastSessionOn: null,
  last14Days: { completedSessions: 0, expectedSessions: null },
  risk: null,
});

const clients = [
  client(1, subscription("active")),
  client(2, subscription("expiring")),
  client(3, subscription("expired")),
  client(4, subscription("paused")),
  client(5, subscription("ended")),
  client(6, null),
];

const idsFor = (filter: Parameters<typeof filterClients>[1]) =>
  filterClients(clients, filter).map((row) => row.id);

describe("clientFilterFromSearch", () => {
  it("reads every `?stato=` value of the contract", () => {
    assert.equal(clientFilterFromSearch("in-scadenza"), "expiring");
    assert.equal(clientFilterFromSearch("scaduti"), "expired");
    assert.equal(clientFilterFromSearch("in-pausa"), "paused");
    assert.equal(clientFilterFromSearch("senza-abbonamento"), "withoutSubscription");
  });

  it("shows every client for a missing, empty or unknown value", () => {
    assert.equal(clientFilterFromSearch(null), "all");
    assert.equal(clientFilterFromSearch(""), "all");
    assert.equal(clientFilterFromSearch("expiring"), "all");
    assert.equal(clientFilterFromSearch("In-Scadenza"), "all");
  });
});

describe("searchForClientFilter", () => {
  it("leaves `?stato=` out for Tutti", () => {
    assert.deepEqual(searchForClientFilter("all"), {});
  });

  it("writes back the value it reads", () => {
    const roundTrips = CLIENT_FILTERS.map((filter) => {
      const search = new URLSearchParams(searchForClientFilter(filter));

      return clientFilterFromSearch(search.get("stato")) === filter;
    });

    assert.deepEqual(roundTrips, CLIENT_FILTERS.map(() => true));
    assert.deepEqual(searchForClientFilter("paused"), { stato: "in-pausa" });
  });
});

describe("filterClients", () => {
  it("keeps every client, in the API order, for Tutti", () => {
    assert.deepEqual(idsFor("all"), [1, 2, 3, 4, 5, 6]);
  });

  it("keeps one subscription status per filter, never the active ones", () => {
    assert.deepEqual(idsFor("expiring"), [2]);
    assert.deepEqual(idsFor("expired"), [3]);
    assert.deepEqual(idsFor("paused"), [4]);
  });

  it("puts an ended subscription with the clients that never had one", () => {
    assert.deepEqual(idsFor("withoutSubscription"), [5, 6]);
  });

  it("finds nothing when no client matches", () => {
    assert.deepEqual(filterClients([client(1, subscription("active"))], "expired"), []);
  });
});

describe("formatClientStatus", () => {
  it("names a client without a subscription", () => {
    assert.equal(formatClientStatus(null), "Senza abbonamento");
  });

  it("uses the labels of the subscription card", () => {
    assert.equal(formatClientStatus(subscription("active")), "In regola");
    assert.equal(formatClientStatus(subscription("expiring")), "In scadenza");
    assert.equal(formatClientStatus(subscription("expired")), "Scaduto");
    assert.equal(formatClientStatus(subscription("ended")), "Chiuso");
    assert.equal(
      formatClientStatus({ ...subscription("paused"), pausedUntil: "2026-11-30" }),
      "In pausa",
    );
  });
});

describe("formatTrainingFrequency", () => {
  it("compares the sessions with the expected ones", () => {
    assert.equal(formatTrainingFrequency({ completedSessions: 3, expectedSessions: 6 }), "3 su 6");
    assert.equal(formatTrainingFrequency({ completedSessions: 0, expectedSessions: 4 }), "0 su 4");
    assert.equal(formatTrainingFrequency({ completedSessions: 8, expectedSessions: 6 }), "8 su 6");
  });

  it("shows only the count without an active program", () => {
    assert.equal(formatTrainingFrequency({ completedSessions: 5, expectedSessions: null }), "5");
    assert.equal(formatTrainingFrequency({ completedSessions: 0, expectedSessions: null }), "0");
  });
});
