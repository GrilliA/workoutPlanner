import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoachToday, InboxItem } from "../../../../api/schemas/coach.ts";
import {
  athleteLabel,
  describeInboxChange,
  formatHandledCount,
  formatPaidThrough,
  hasSubscriptionReason,
  hideHandledItem,
  inboxEmptyMessage,
  inboxReasons,
  mapRecentActivity,
  restoreHandledItem,
} from "./today.ts";

// The rows of the GET /coach/today example in docs/contracts/pt-oggi.md (today = 2026-10-27).
const today = "2026-10-27";

const giulia: InboxItem = {
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
};

const marco: InboxItem = {
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
};

const luca: InboxItem = {
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
};

const sara: InboxItem = {
  athleteId: 70,
  athleteName: "Sara Verdi",
  athleteEmail: "sara@example.com",
  severity: "low",
  risk: null,
  alerts: [{ kind: "personal_records", message: "Nuovi record: Panca piana, Squat" }],
  subscription: { status: "active", paidThrough: "2026-12-15", daysLeft: 49, pausedUntil: null },
};

const contractExample: CoachToday = {
  clientCount: 12,
  handledCount: 1,
  items: [giulia, marco, luca, sara],
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

const athleteIds = (todayAnswer: CoachToday): number[] => todayAnswer.items.map((item) => item.athleteId);

describe("athleteLabel", () => {
  it("shows the name, or the email of a client without one", () => {
    assert.equal(athleteLabel(giulia.athleteName, giulia.athleteEmail), "Giulia Rossi");
    assert.equal(athleteLabel(luca.athleteName, luca.athleteEmail), "luca@example.com");
    assert.equal(athleteLabel("  ", "vuoto@example.com"), "vuoto@example.com");
  });
});

describe("inboxReasons", () => {
  it("lists the risk reasons, then the alerts, with the API messages as they are", () => {
    assert.deepEqual(inboxReasons(giulia), [
      { kind: "subscription_expiring", message: "Abbonamento in scadenza tra 3 giorni", tone: "accent" },
      { kind: "low_frequency", message: "2 sessioni su 6 negli ultimi 14 giorni", tone: "warning" },
      { kind: "program_expiring", message: "Scheda in scadenza tra 5 giorni", tone: "accent" },
    ]);
  });

  it("colours each reason from its kind", () => {
    assert.deepEqual(
      [marco, luca, sara].map((item) => inboxReasons(item).map((reason) => reason.tone)),
      [["error"], ["warning"], ["data"]],
    );
  });
});

describe("hasSubscriptionReason", () => {
  it("is true for a subscription expiring or expired, false otherwise", () => {
    assert.deepEqual(
      [giulia, marco, luca, sara].map((item) => hasSubscriptionReason(item)),
      [true, true, false, false],
    );
  });
});

describe("formatPaidThrough", () => {
  it("shows the paid-through day with the right preposition", () => {
    assert.equal(formatPaidThrough(giulia.subscription, today), "Pagato fino al 30 ott");
    assert.equal(
      formatPaidThrough({ status: "active", paidThrough: "2026-11-08", daysLeft: 12, pausedUntil: null }, today),
      "Pagato fino all'8 nov",
    );
  });

  it("has nothing to show without a subscription or with a closed one", () => {
    const ended = { status: "ended" as const, paidThrough: "2026-10-01", daysLeft: -26, pausedUntil: null };

    assert.equal(formatPaidThrough(luca.subscription, today), null);
    assert.equal(formatPaidThrough(ended, today), null);
  });
});

describe("inboxEmptyMessage", () => {
  it("tells a coach who handled everything from one with nothing to do", () => {
    assert.equal(inboxEmptyMessage(2), "Hai gestito tutto: nessun altro cliente da seguire oggi.");
    assert.equal(inboxEmptyMessage(0), "Tutto in ordine: nessun cliente da seguire oggi.");
  });
});

describe("formatHandledCount", () => {
  it("agrees with one client or more", () => {
    assert.equal(formatHandledCount(1), "1 cliente gestito: torna in lista dopo 7 giorni, o prima se peggiora.");
    assert.equal(
      formatHandledCount(3),
      "3 clienti gestiti: tornano in lista dopo 7 giorni, o prima se peggiorano.",
    );
  });
});

describe("hideHandledItem and restoreHandledItem", () => {
  it("hide the row and count it as handled", () => {
    const afterHandled = hideHandledItem(contractExample, marco.athleteId);

    assert.deepEqual(athleteIds(afterHandled), [42, 61, 70]);
    assert.equal(afterHandled.handledCount, 2);
    assert.deepEqual(athleteIds(contractExample), [42, 57, 61, 70]);
  });

  it("leave the count alone for a row that is not shown", () => {
    assert.deepEqual(hideHandledItem(contractExample, 999), contractExample);
  });

  it("put the row back where it was", () => {
    const afterHandled = hideHandledItem(contractExample, marco.athleteId);
    const afterUndo = restoreHandledItem(afterHandled, { item: marco, position: 1 });

    assert.deepEqual(afterUndo, contractExample);
  });

  it("put the last row back at the end, and do not show a row twice", () => {
    const afterHandled = hideHandledItem(contractExample, sara.athleteId);
    const afterUndo = restoreHandledItem(afterHandled, { item: sara, position: 3 });

    assert.deepEqual(athleteIds(afterUndo), [42, 57, 61, 70]);
    assert.deepEqual(restoreHandledItem(afterUndo, { item: sara, position: 0 }), afterUndo);
  });

  it("never count less than zero handled rows", () => {
    const withoutSara = { ...contractExample, items: [giulia, marco, luca], handledCount: 0 };

    assert.equal(restoreHandledItem(withoutSara, { item: sara, position: 3 }).handledCount, 0);
  });
});

describe("describeInboxChange", () => {
  it("announces Gestito and Annulla with the client label", () => {
    assert.equal(describeInboxChange(null), "");
    assert.equal(
      describeInboxChange({ kind: "handled", row: { item: giulia, position: 0 } }),
      "Gestito: Giulia Rossi. Puoi annullare.",
    );
    assert.equal(
      describeInboxChange({ kind: "restored", row: { item: luca, position: 2 } }),
      "Annullato: luca@example.com è di nuovo in lista.",
    );
  });
});

describe("mapRecentActivity", () => {
  it("maps the feed of the contract example", () => {
    const [session] = mapRecentActivity(contractExample.recentActivity);

    assert.equal(session.sessionId, 901);
    assert.equal(session.athleteId, 70);
    assert.equal(session.athleteLabel, "Sara Verdi");
    assert.equal(session.workoutName, "Forza A");
    assert.match(session.completedAtLabel, /^26 ott 2026$/);
  });
});
