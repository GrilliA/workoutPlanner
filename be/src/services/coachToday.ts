import { INBOX_SEVERITIES, type InboxSeverity } from "../db/schema/coachinboxhandled";
import { computeE1RM } from "./analytics";
import { daysUntilExpiry } from "./assignmentStatus";
import { churnRisk, STATUSES_WITH_DUE_DATE, type ChurnRisk } from "./churnRisk";
import type { TrainingFrequency } from "./clientActivity";
import type { ClientSubscriptionSummary } from "./coachAthleteAccess";
import { addRomeDays, toRomeDateKey } from "./stats";

/** Rome days of the record window, today included. The record query reads from one day earlier. */
export const PERSONAL_RECORD_WINDOW_DAYS = 7;

const HANDLED_HIDDEN_DAYS = 7;
const PROGRAM_EXPIRING_WINDOW_DAYS = 7;
const MAX_RECORD_NAMES = 3;

type InboxAlertKind = "program_expiring" | "personal_records";

type InboxAlert = { kind: InboxAlertKind; message: string };

export type InboxItem = {
  athleteId: number;
  athleteName: string | null;
  athleteEmail: string;
  severity: InboxSeverity;
  risk: ChurnRisk | null;
  alerts: InboxAlert[];
  subscription: ClientSubscriptionSummary | null;
};

const SEVERITY_RANK: Record<InboxSeverity, number> = { low: 1, medium: 2, high: 3 };

const ALERT_SEVERITY: Record<InboxAlertKind, InboxSeverity> = {
  program_expiring: "medium",
  personal_records: "low",
};

const programExpiringMessage = (daysLeft: number): string => {
  if (daysLeft === 0) {
    return "Scheda in scadenza oggi";
  }

  if (daysLeft === 1) {
    return "Scheda in scadenza domani";
  }

  return `Scheda in scadenza tra ${daysLeft} giorni`;
};

/** The rule of `buildCoachAlerts`, on this coach's active program. */
const programExpiringAlert = (programExpiresOn: string | null, today: string): InboxAlert | null => {
  if (programExpiresOn === null) {
    return null;
  }

  const daysLeft = daysUntilExpiry(programExpiresOn, today);
  const isExpiringSoon = daysLeft >= 0 && daysLeft <= PROGRAM_EXPIRING_WINDOW_DAYS;

  if (!isExpiringSoon) {
    return null;
  }

  return { kind: "program_expiring", message: programExpiringMessage(daysLeft) };
};

const personalRecordsAlert = (exerciseNames: string[]): InboxAlert | null => {
  if (exerciseNames.length === 0) {
    return null;
  }

  // A catalog exercise and a custom one with the same name are two records but one name to show.
  const sortedNames = [...new Set(exerciseNames)].sort((left, right) => left.localeCompare(right, "it"));
  const shownNames = sortedNames.slice(0, MAX_RECORD_NAMES).join(", ");
  const otherCount = sortedNames.length - MAX_RECORD_NAMES;

  if (sortedNames.length === 1) {
    return { kind: "personal_records", message: `Nuovo record: ${shownNames}` };
  }

  if (otherCount <= 0) {
    return { kind: "personal_records", message: `Nuovi record: ${shownNames}` };
  }

  return { kind: "personal_records", message: `Nuovi record: ${shownNames} e altri ${otherCount}` };
};

const isAlert = (alert: InboxAlert | null): alert is InboxAlert => alert !== null;

const rowSeverity = (risk: ChurnRisk | null, alerts: InboxAlert[]): InboxSeverity => {
  const riskSeverities: InboxSeverity[] = risk === null ? [] : [risk.level];
  const reasonSeverities = [...riskSeverities, ...alerts.map((alert) => ALERT_SEVERITY[alert.kind])];

  // INBOX_SEVERITIES runs from the highest down, so the first one present is the row's.
  // A row always has a reason: "low" only satisfies the type.
  return INBOX_SEVERITIES.find((severity) => reasonSeverities.includes(severity)) ?? "low";
};

/**
 * One row per client, null when there is nothing to report. A pause takes the client out of
 * every reason, also the program and the records, not only the risk.
 */
export const inboxItem = (input: {
  client: { athleteId: number; athleteName: string | null; athleteEmail: string; linkedOn: string };
  subscription: ClientSubscriptionSummary | null;
  lastSessionOn: string | null;
  last14Days: TrainingFrequency;
  programExpiresOn: string | null;
  personalRecordExercises: string[];
  today: string;
}): InboxItem | null => {
  if (input.subscription?.status === "paused") {
    return null;
  }

  const risk = churnRisk({
    subscription: input.subscription,
    last14Days: input.last14Days,
    lastSessionOn: input.lastSessionOn,
    linkedOn: input.client.linkedOn,
    today: input.today,
  });
  const alerts = [
    programExpiringAlert(input.programExpiresOn, input.today),
    personalRecordsAlert(input.personalRecordExercises),
  ].filter(isAlert);

  if (risk === null && alerts.length === 0) {
    return null;
  }

  return {
    athleteId: input.client.athleteId,
    athleteName: input.client.athleteName,
    athleteEmail: input.client.athleteEmail,
    severity: rowSeverity(risk, alerts),
    risk,
    alerts,
    subscription: input.subscription,
  };
};

type RecordSet = {
  sessionId: number;
  completedAt: Date;
  catalogId: string | null;
  exerciseName: string;
  weightKg: number | null;
  reps: number;
};

type ScoredSet = {
  sessionId: number;
  completedAt: Date;
  exerciseKey: string;
  exerciseName: string;
  e1RM: number;
};

type SessionBest = {
  sessionId: number;
  completedAt: Date;
  exerciseName: string;
  bestE1RM: number;
};

/**
 * Every assignment and revision copies the exercises with new ids, so the same exercise is
 * followed by its catalog id, or else by its name. The prefixes keep the two kinds apart.
 */
const exerciseKeyOf = (set: RecordSet): string => {
  if (set.catalogId !== null) {
    return `catalog:${set.catalogId}`;
  }

  return `name:${set.exerciseName.trim().toLowerCase()}`;
};

const compareByCompletion = (left: SessionBest, right: SessionBest): number => {
  const timeDifference = left.completedAt.getTime() - right.completedAt.getTime();

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.sessionId - right.sessionId;
};

/**
 * The best e1RM of each session, oldest session first. `sets` are of one exercise.
 * One pass with a running best: a spread `Math.max` overflows the stack on a session with
 * hundreds of thousands of sets, and filtering per session is quadratic.
 */
const sessionBestsOf = (sets: ScoredSet[]): SessionBest[] => {
  const bestBySession = new Map<number, SessionBest>();

  for (const set of sets) {
    const sessionBest = bestBySession.get(set.sessionId);

    if (sessionBest === undefined) {
      bestBySession.set(set.sessionId, {
        sessionId: set.sessionId,
        completedAt: set.completedAt,
        exerciseName: set.exerciseName,
        bestE1RM: set.e1RM,
      });
      continue;
    }

    if (set.e1RM > sessionBest.bestE1RM) {
      bestBySession.set(set.sessionId, { ...sessionBest, bestE1RM: set.e1RM });
    }
  }

  return [...bestBySession.values()].sort(compareByCompletion);
};

/**
 * A session beats every earlier one, strictly. The first time an exercise appears is not a
 * record (unlike `countPersonalRecords`): every new program would make one on each exercise.
 * The best so far only grows on a record, so one walk compares each session with all earlier ones.
 */
const recordSessionsOf = (sessionBests: SessionBest[]): SessionBest[] => {
  const [firstSession, ...laterSessions] = sessionBests;

  if (firstSession === undefined) {
    return [];
  }

  let bestSoFar = firstSession.bestE1RM;
  const records: SessionBest[] = [];

  for (const session of laterSessions) {
    if (session.bestE1RM > bestSoFar) {
      records.push(session);
      bestSoFar = session.bestE1RM;
    }
  }

  return records;
};

/**
 * Exercises with a record in the last 7 Rome days, today included, named as in the latest
 * session with a record. `sets` are of one athlete and hold the whole history.
 */
export const recentPersonalRecords = (input: { sets: RecordSet[]; today: string }): string[] => {
  const firstDayOfWindow = addRomeDays(input.today, 1 - PERSONAL_RECORD_WINDOW_DAYS);
  const scoredSets: ScoredSet[] = input.sets.flatMap((set) => {
    const e1RM = computeE1RM(set.weightKg, set.reps);

    if (e1RM === null) {
      return [];
    }

    return [
      {
        sessionId: set.sessionId,
        completedAt: set.completedAt,
        exerciseKey: exerciseKeyOf(set),
        exerciseName: set.exerciseName,
        e1RM,
      },
    ];
  });
  // Grouped in one pass, in order of first appearance: filtering once per exercise is quadratic.
  const setsByExercise = new Map<string, ScoredSet[]>();

  for (const set of scoredSets) {
    const exerciseSets = setsByExercise.get(set.exerciseKey);

    if (exerciseSets === undefined) {
      setsByExercise.set(set.exerciseKey, [set]);
      continue;
    }

    exerciseSets.push(set);
  }

  return [...setsByExercise.values()].flatMap((exerciseSets) => {
    const recentRecords = recordSessionsOf(sessionBestsOf(exerciseSets)).filter((session) => {
      const completedOn = toRomeDateKey(session.completedAt);
      return firstDayOfWindow <= completedOn && completedOn <= input.today;
    });
    const latestRecord = recentRecords[recentRecords.length - 1];

    if (latestRecord === undefined) {
      return [];
    }

    return [latestRecord.exerciseName];
  });
};

type InboxEntry = { item: InboxItem; daysWithoutSession: number };

type HandledRow = { athleteId: number; handledAt: Date; severityAtHandle: InboxSeverity };

const compareWithNullsLast = <T>(
  left: T | null,
  right: T | null,
  compare: (left: T, right: T) => number,
): number => {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return compare(left, right);
};

// Paused clients have no row; without a subscription, or with an ended one, there is no due date.
const dueDaysLeft = (subscription: ClientSubscriptionSummary | null): number | null => {
  if (subscription === null || !STATUSES_WITH_DUE_DATE.includes(subscription.status)) {
    return null;
  }

  return subscription.daysLeft;
};

/**
 * Severity first, then the subscription due first (the longest expired on top), then the most
 * days without a session, then the order of `GET /coach/clients` made deterministic.
 */
const compareInboxEntries = (left: InboxEntry, right: InboxEntry): number => {
  const comparisons = [
    SEVERITY_RANK[right.item.severity] - SEVERITY_RANK[left.item.severity],
    compareWithNullsLast(
      dueDaysLeft(left.item.subscription),
      dueDaysLeft(right.item.subscription),
      (leftDays, rightDays) => leftDays - rightDays,
    ),
    right.daysWithoutSession - left.daysWithoutSession,
    compareWithNullsLast(left.item.athleteName, right.item.athleteName, (leftName, rightName) =>
      leftName.localeCompare(rightName, "it"),
    ),
    left.item.athleteEmail.localeCompare(right.item.athleteEmail, "it"),
    left.item.athleteId - right.item.athleteId,
  ];

  return comparisons.find((comparison) => comparison !== 0) ?? 0;
};

/**
 * Hidden for 7 Rome days from the day it was handled, unless the row got worse since:
 * then it comes back at once.
 */
const isHiddenByHandled = (handled: HandledRow, severity: InboxSeverity, today: string): boolean => {
  const handledOn = toRomeDateKey(handled.handledAt);
  const isWithinHiddenDays = today < addRomeDays(handledOn, HANDLED_HIDDEN_DAYS);
  const hasGotWorse = SEVERITY_RANK[severity] > SEVERITY_RANK[handled.severityAtHandle];

  return isWithinHiddenDays && !hasGotWorse;
};

/** Sorts the rows, hides the handled ones and counts them. `daysWithoutSession` only sorts. */
export const buildInbox = (input: {
  entries: InboxEntry[];
  handled: HandledRow[];
  today: string;
}): { items: InboxItem[]; handledCount: number } => {
  const isHidden = (item: InboxItem): boolean => {
    const handled = input.handled.find((row) => row.athleteId === item.athleteId);

    if (handled === undefined) {
      return false;
    }

    return isHiddenByHandled(handled, item.severity, input.today);
  };
  const sortedItems = [...input.entries].sort(compareInboxEntries).map((entry) => entry.item);
  const items = sortedItems.filter((item) => !isHidden(item));

  return { items, handledCount: sortedItems.length - items.length };
};
