import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildInbox, inboxItem, recentPersonalRecords, type InboxItem } from "./coachToday";

const today = "2026-10-27";

// Expected dates are written by hand, not with the code under test. Noon UTC is the same day in Rome.
const noonOf = (day: string): Date => new Date(`${day}T12:00:00Z`);

const activeSubscription = {
  status: "active" as const,
  paidThrough: "2026-12-06",
  daysLeft: 40,
  pausedUntil: null,
};

/** A client with nothing to report: paid, training as planned, no program ending, no record. */
const quietClient = {
  client: { athleteId: 1, athleteName: "Giulia", athleteEmail: "giulia@example.com", linkedOn: "2026-01-10" },
  subscription: activeSubscription,
  lastSessionOn: "2026-10-26",
  last14Days: { completedSessions: 6, expectedSessions: 6 },
  programExpiresOn: null,
  personalRecordExercises: [],
  today,
};

const recordSet = (
  sessionId: number,
  day: string,
  exercise: { catalogId: string | null; name: string },
  weightKg: number | null,
  reps: number,
) => ({
  sessionId,
  completedAt: noonOf(day),
  catalogId: exercise.catalogId,
  exerciseName: exercise.name,
  weightKg,
  reps,
});

const benchPress = { catalogId: "bench-press", name: "Panca piana" };
const squat = { catalogId: "squat", name: "Squat" };

describe("inboxItem", () => {
  it("1. the severity is the highest of the risk and the alerts; nothing to report is no row", () => {
    const highRisk = inboxItem({
      ...quietClient,
      subscription: { ...activeSubscription, status: "expiring", daysLeft: 3 },
      last14Days: { completedSessions: 1, expectedSessions: 6 },
      personalRecordExercises: ["Squat"],
    });
    const mediumRisk = inboxItem({
      ...quietClient,
      subscription: { ...activeSubscription, status: "expiring", daysLeft: 3 },
      personalRecordExercises: ["Squat"],
    });
    const onlyProgram = inboxItem({ ...quietClient, programExpiresOn: "2026-10-30" });
    const onlyRecords = inboxItem({ ...quietClient, personalRecordExercises: ["Squat"] });
    const nothing = inboxItem(quietClient);

    assert.equal(highRisk?.severity, "high");
    assert.equal(mediumRisk?.severity, "medium");
    assert.equal(onlyProgram?.severity, "medium");
    assert.equal(onlyProgram?.risk, null);
    assert.equal(onlyRecords?.severity, "low");
    assert.equal(nothing, null);
  });

  it("keeps the client, the risk, the alerts in order and the subscription as given", () => {
    const item = inboxItem({
      ...quietClient,
      subscription: { ...activeSubscription, status: "expiring", daysLeft: 3 },
      programExpiresOn: "2026-11-01",
      personalRecordExercises: ["Squat"],
    });

    assert.deepEqual(item, {
      athleteId: 1,
      athleteName: "Giulia",
      athleteEmail: "giulia@example.com",
      severity: "medium",
      risk: {
        level: "medium",
        reasons: [{ kind: "subscription_expiring", message: "Abbonamento in scadenza tra 3 giorni" }],
      },
      alerts: [
        { kind: "program_expiring", message: "Scheda in scadenza tra 5 giorni" },
        { kind: "personal_records", message: "Nuovo record: Squat" },
      ],
      subscription: { ...activeSubscription, status: "expiring", daysLeft: 3 },
    });
  });

  it("2. a paused client has no row, even with a program ending and a record", () => {
    const item = inboxItem({
      ...quietClient,
      subscription: { ...activeSubscription, status: "paused", pausedUntil: "2026-11-10" },
      lastSessionOn: "2026-09-01",
      programExpiresOn: "2026-10-28",
      personalRecordExercises: ["Squat"],
    });

    assert.equal(item, null);
  });

  it("3. program_expiring: today, tomorrow, 7 days included, 8 excluded, an ended program excluded", () => {
    const alertsFor = (programExpiresOn: string) =>
      inboxItem({ ...quietClient, programExpiresOn })?.alerts ?? [];

    assert.deepEqual(alertsFor("2026-10-27"), [
      { kind: "program_expiring", message: "Scheda in scadenza oggi" },
    ]);
    assert.deepEqual(alertsFor("2026-10-28"), [
      { kind: "program_expiring", message: "Scheda in scadenza domani" },
    ]);
    assert.deepEqual(alertsFor("2026-11-03"), [
      { kind: "program_expiring", message: "Scheda in scadenza tra 7 giorni" },
    ]);
    assert.deepEqual(alertsFor("2026-11-04"), []);
    assert.deepEqual(alertsFor("2026-10-26"), []);
  });

  it("names up to three exercises with a record, in alphabetical order, then how many more", () => {
    const messageFor = (personalRecordExercises: string[]) =>
      inboxItem({ ...quietClient, personalRecordExercises })?.alerts[0]?.message;

    assert.equal(messageFor(["Squat", "Panca piana"]), "Nuovi record: Panca piana, Squat");
    assert.equal(
      messageFor(["Stacco", "Squat", "Panca piana"]),
      "Nuovi record: Panca piana, Squat, Stacco",
    );
    assert.equal(
      messageFor(["Stacco", "Squat", "Panca piana", "Affondi"]),
      "Nuovi record: Affondi, Panca piana, Squat e altri 1",
    );
  });

  it("names a catalog exercise and a custom one with the same name once", () => {
    const customBenchPress = { catalogId: null, name: "Panca piana" };
    const records = recentPersonalRecords({
      sets: [
        recordSet(1, "2026-10-01", benchPress, 100, 5),
        recordSet(1, "2026-10-01", customBenchPress, 80, 5),
        recordSet(2, "2026-10-24", benchPress, 110, 5),
        recordSet(2, "2026-10-24", customBenchPress, 90, 5),
      ],
      today,
    });
    const item = inboxItem({ ...quietClient, personalRecordExercises: records });

    assert.deepEqual(records, ["Panca piana", "Panca piana"]);
    assert.deepEqual(item?.alerts, [{ kind: "personal_records", message: "Nuovo record: Panca piana" }]);
  });
});

describe("recentPersonalRecords", () => {
  it("4. the first time an exercise appears is not a record", () => {
    const records = recentPersonalRecords({
      sets: [recordSet(1, "2026-10-25", benchPress, 100, 5)],
      today,
    });

    assert.deepEqual(records, []);
  });

  it("4. the same best is not a record; a strictly better one is", () => {
    const equal = recentPersonalRecords({
      sets: [
        recordSet(1, "2026-10-10", benchPress, 100, 5),
        recordSet(2, "2026-10-25", benchPress, 100, 5),
      ],
      today,
    });
    const better = recentPersonalRecords({
      sets: [
        recordSet(1, "2026-10-10", benchPress, 100, 5),
        recordSet(2, "2026-10-25", benchPress, 90, 8),
        recordSet(2, "2026-10-25", benchPress, 102.5, 5),
      ],
      today,
    });

    assert.deepEqual(equal, []);
    assert.deepEqual(better, ["Panca piana"]);
  });

  it("4. a record 6 days ago counts, 7 days ago does not", () => {
    const records = recentPersonalRecords({
      sets: [
        recordSet(1, "2026-10-01", benchPress, 100, 5),
        recordSet(2, "2026-10-21", benchPress, 105, 5),
        recordSet(1, "2026-10-01", squat, 120, 5),
        recordSet(3, "2026-10-20", squat, 130, 5),
      ],
      today,
    });

    assert.deepEqual(records, ["Panca piana"]);
  });

  it("4. the same catalog id on two programs is the same exercise, named as in the latest record", () => {
    const records = recentPersonalRecords({
      sets: [
        recordSet(1, "2026-10-01", { catalogId: "bench-press", name: "Panca" }, 100, 5),
        recordSet(2, "2026-10-24", { catalogId: "bench-press", name: "Panca piana (scheda B)" }, 110, 5),
      ],
      today,
    });

    assert.deepEqual(records, ["Panca piana (scheda B)"]);
  });

  it("4. without a catalog id the name matches with trim and lower case", () => {
    const records = recentPersonalRecords({
      sets: [
        recordSet(1, "2026-10-01", { catalogId: null, name: "Panca Piana " }, 100, 5),
        recordSet(2, "2026-10-24", { catalogId: null, name: "panca piana" }, 110, 5),
      ],
      today,
    });

    assert.deepEqual(records, ["panca piana"]);
  });

  it("4. a catalog exercise and a custom one with the same name are not the same", () => {
    const records = recentPersonalRecords({
      sets: [
        recordSet(1, "2026-10-01", { catalogId: "bench-press", name: "Panca piana" }, 100, 5),
        recordSet(2, "2026-10-24", { catalogId: null, name: "Panca piana" }, 110, 5),
      ],
      today,
    });

    assert.deepEqual(records, []);
  });

  it("4. sets without weight, with 0 kg or with 13 reps are ignored", () => {
    const ignoredLater = recentPersonalRecords({
      sets: [
        recordSet(1, "2026-10-01", benchPress, 100, 5),
        recordSet(2, "2026-10-24", benchPress, null, 5),
        recordSet(2, "2026-10-24", benchPress, 0, 5),
        recordSet(2, "2026-10-24", benchPress, 200, 13),
      ],
      today,
    });
    // The ignored set does not make the first appearance: the later session is the first one.
    const ignoredFirst = recentPersonalRecords({
      sets: [
        recordSet(1, "2026-10-01", benchPress, 200, 13),
        recordSet(2, "2026-10-24", benchPress, 100, 5),
      ],
      today,
    });

    assert.deepEqual(ignoredLater, []);
    assert.deepEqual(ignoredFirst, []);
  });

  it("compares with every earlier session, not only the previous one", () => {
    const records = recentPersonalRecords({
      sets: [
        recordSet(1, "2026-10-01", benchPress, 110, 5),
        recordSet(2, "2026-10-10", benchPress, 90, 5),
        recordSet(3, "2026-10-24", benchPress, 100, 5),
      ],
      today,
    });

    assert.deepEqual(records, []);
  });

  it("4. a client with four exercises with a record ends with 'e altri 1'", () => {
    const exercisesWithRecord = [
      { catalogId: "squat", name: "Squat" },
      { catalogId: "bench-press", name: "Panca piana" },
      { catalogId: "deadlift", name: "Stacco" },
      { catalogId: "lunge", name: "Affondi" },
    ];
    const sets = exercisesWithRecord.flatMap((exercise) => [
      recordSet(1, "2026-10-01", exercise, 100, 5),
      recordSet(2, "2026-10-25", exercise, 105, 5),
    ]);
    const records = recentPersonalRecords({ sets, today });
    const item = inboxItem({ ...quietClient, personalRecordExercises: records });

    assert.deepEqual(item?.alerts, [
      { kind: "personal_records", message: "Nuovi record: Affondi, Panca piana, Squat e altri 1" },
    ]);
  });

  it("walks 200 000 sets in one session and 20 000 sessions of one exercise", () => {
    const setCount = 200_000;
    const sessionCount = 20_000;
    const hourInMs = 3_600_000;
    // Two sessions of bench press, the later one beaten by its very last set.
    const benchPressSets = [
      ...Array.from({ length: setCount }, () => recordSet(1, "2026-10-01", benchPress, 100, 5)),
      ...Array.from({ length: setCount }, (_, index) => {
        const weightKg = index === setCount - 1 ? 101 : 90;
        return recordSet(2, "2026-10-25", benchPress, weightKg, 5);
      }),
    ];
    // The first squat session is the heaviest: the next 19 999 grow but never beat it.
    const oldSquatSets = Array.from({ length: sessionCount }, (_, index) => ({
      sessionId: 1000 + index,
      completedAt: new Date(Date.UTC(2024, 0, 1, 12) + index * hourInMs),
      catalogId: squat.catalogId,
      exerciseName: squat.name,
      weightKg: index === 0 ? 200 : 100 + index / 1000,
      reps: 5,
    }));
    const recentSquatSets = [
      recordSet(30_000, "2026-10-24", squat, 199, 5),
      recordSet(30_001, "2026-10-26", squat, 201, 5),
    ];

    const records = recentPersonalRecords({
      sets: [...benchPressSets, ...oldSquatSets, ...recentSquatSets],
      today,
    });

    assert.deepEqual(records, ["Panca piana", "Squat"]);
  });
});

const inboxRow = (
  athleteId: number,
  overrides: Partial<InboxItem> = {},
): InboxItem => ({
  athleteId,
  athleteName: `Cliente ${athleteId}`,
  athleteEmail: `cliente${athleteId}@example.com`,
  severity: "medium",
  risk: null,
  alerts: [{ kind: "program_expiring", message: "Scheda in scadenza tra 3 giorni" }],
  subscription: null,
  ...overrides,
});

const subscriptionDue = (
  status: "active" | "expiring" | "expired" | "ended",
  daysLeft: number,
) => ({ status, paidThrough: "2026-10-27", daysLeft, pausedUntil: null });

const idsOf = (items: InboxItem[]): number[] => items.map((item) => item.athleteId);

describe("buildInbox", () => {
  it("5. sorts by severity, then subscription due, then days without a session, then name, email, id", () => {
    const entries = [
      { item: inboxRow(1, { severity: "low" }), daysWithoutSession: 30 },
      { item: inboxRow(2, { subscription: subscriptionDue("expiring", 5) }), daysWithoutSession: 0 },
      { item: inboxRow(3, { subscription: subscriptionDue("expired", -2) }), daysWithoutSession: 0 },
      { item: inboxRow(4, { subscription: subscriptionDue("expired", -10) }), daysWithoutSession: 0 },
      { item: inboxRow(5), daysWithoutSession: 3 },
      { item: inboxRow(6, { subscription: subscriptionDue("ended", -1) }), daysWithoutSession: 9 },
      { item: inboxRow(7, { severity: "high" }), daysWithoutSession: 0 },
      { item: inboxRow(8, { athleteName: null }), daysWithoutSession: 3 },
      { item: inboxRow(9, { athleteName: "Alfa", athleteEmail: "z@example.com" }), daysWithoutSession: 3 },
      { item: inboxRow(10, { athleteName: "Alfa", athleteEmail: "a@example.com" }), daysWithoutSession: 3 },
      { item: inboxRow(11, { athleteName: "Alfa", athleteEmail: "a@example.com" }), daysWithoutSession: 3 },
    ];

    const inbox = buildInbox({ entries, handled: [], today });

    // 6 (ended, 9 days) and 5, 8, 9, 10, 11 (no subscription, 3 days) have no due date.
    assert.deepEqual(idsOf(inbox.items), [7, 4, 3, 2, 6, 10, 11, 9, 5, 8, 1]);
    assert.equal(inbox.handledCount, 0);
  });

  it("6. handled at the same severity is hidden from day 0 to day 6 and back on day 7", () => {
    const entries = [{ item: inboxRow(1), daysWithoutSession: 0 }];
    const handled = [{ athleteId: 1, handledAt: noonOf("2026-10-27"), severityAtHandle: "medium" as const }];
    const inboxOn = (day: string) => buildInbox({ entries, handled, today: day });

    ["2026-10-27", "2026-10-30", "2026-11-02"].forEach((day) => {
      assert.deepEqual(inboxOn(day), { items: [], handledCount: 1 }, day);
    });
    assert.deepEqual(idsOf(inboxOn("2026-11-03").items), [1]);
    assert.equal(inboxOn("2026-11-03").handledCount, 0);
  });

  it("6. a row that got worse comes back and is not counted; a row that got better stays hidden", () => {
    const handledAt = noonOf("2026-10-25");
    const inbox = buildInbox({
      entries: [
        { item: inboxRow(1, { severity: "high" }), daysWithoutSession: 0 },
        { item: inboxRow(2, { severity: "low" }), daysWithoutSession: 0 },
        { item: inboxRow(3, { severity: "medium" }), daysWithoutSession: 0 },
      ],
      handled: [
        { athleteId: 1, handledAt, severityAtHandle: "medium" },
        { athleteId: 2, handledAt, severityAtHandle: "high" },
        { athleteId: 3, handledAt, severityAtHandle: "high" },
      ],
      today,
    });

    assert.deepEqual(idsOf(inbox.items), [1]);
    assert.equal(inbox.handledCount, 2);
  });

  it("6. a handled client with no row today is not counted", () => {
    const inbox = buildInbox({
      entries: [{ item: inboxRow(1), daysWithoutSession: 0 }],
      handled: [{ athleteId: 2, handledAt: noonOf("2026-10-26"), severityAtHandle: "medium" }],
      today,
    });

    assert.deepEqual(idsOf(inbox.items), [1]);
    assert.equal(inbox.handledCount, 0);
  });

  it("7. 23:30 UTC on 26/10 is 27/10 in Rome: the row comes back on 03/11", () => {
    const entries = [{ item: inboxRow(1), daysWithoutSession: 0 }];
    const handled = [
      { athleteId: 1, handledAt: new Date("2026-10-26T23:30:00Z"), severityAtHandle: "medium" as const },
    ];

    assert.equal(buildInbox({ entries, handled, today: "2026-11-02" }).handledCount, 1);
    assert.deepEqual(idsOf(buildInbox({ entries, handled, today: "2026-11-03" }).items), [1]);
  });
});
