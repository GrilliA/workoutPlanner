import { FREQUENCY_WINDOW_DAYS, type TrainingFrequency } from "./clientActivity";
import { daysBetween, type SubscriptionStatus } from "./subscription";

const RISK_EXPIRY_WINDOW_DAYS = 14;
const INACTIVE_AFTER_DAYS = 7;

/** A paused subscription has no risk at all, and an ended one does not expire: it is closed. */
export const STATUSES_WITH_DUE_DATE: SubscriptionStatus[] = ["active", "expiring", "expired"];

type ChurnRiskLevel = "high" | "medium";

type ChurnRiskReasonKind =
  | "subscription_expiring"
  | "subscription_expired"
  | "low_frequency"
  | "no_recent_session";

type ChurnRiskReason = { kind: ChurnRiskReasonKind; message: string };

export type ChurnRisk = {
  level: ChurnRiskLevel;
  reasons: ChurnRiskReason[];
};

/**
 * Days since the last session or the link, whichever is later: the sessions before the link
 * (with another coach, or alone) say nothing about this client, and a client who never trained
 * counts from the day they linked.
 */
export const daysWithoutSession = (input: {
  lastSessionOn: string | null;
  linkedOn: string;
  today: string;
}): number => {
  if (input.lastSessionOn === null || input.lastSessionOn < input.linkedOn) {
    return daysBetween(input.linkedOn, input.today);
  }

  return daysBetween(input.lastSessionOn, input.today);
};

const subscriptionMessage = (daysLeft: number): string => {
  if (daysLeft === 0) {
    return "Abbonamento in scadenza oggi";
  }

  if (daysLeft === 1) {
    return "Abbonamento in scadenza domani";
  }

  if (daysLeft === -1) {
    return "Abbonamento scaduto ieri";
  }

  if (daysLeft < 0) {
    return `Abbonamento scaduto da ${-daysLeft} giorni`;
  }

  return `Abbonamento in scadenza tra ${daysLeft} giorni`;
};

// An expired subscription always meets the condition, however old: an unpaid client stays at risk.
const subscriptionReason = (
  subscription: { status: SubscriptionStatus; daysLeft: number } | null,
): ChurnRiskReason | null => {
  if (subscription === null || !STATUSES_WITH_DUE_DATE.includes(subscription.status)) {
    return null;
  }

  if (subscription.daysLeft > RISK_EXPIRY_WINDOW_DAYS) {
    return null;
  }

  const kind = subscription.daysLeft < 0 ? "subscription_expired" : "subscription_expiring";

  return { kind, message: subscriptionMessage(subscription.daysLeft) };
};

// Without an active program nothing is expected, so only the days without a session count.
const lowFrequencyReason = (last14Days: TrainingFrequency): ChurnRiskReason | null => {
  const { completedSessions, expectedSessions } = last14Days;

  // Strictly under half: 3 out of 6 is not a risk.
  if (expectedSessions === null || completedSessions * 2 >= expectedSessions) {
    return null;
  }

  const sessionWord = completedSessions === 1 ? "sessione" : "sessioni";

  return {
    kind: "low_frequency",
    message: `${completedSessions} ${sessionWord} su ${expectedSessions} negli ultimi ${FREQUENCY_WINDOW_DAYS} giorni`,
  };
};

const noRecentSessionReason = (input: {
  lastSessionOn: string | null;
  linkedOn: string;
  today: string;
}): ChurnRiskReason | null => {
  const days = daysWithoutSession(input);

  if (days < INACTIVE_AFTER_DAYS) {
    return null;
  }

  const hasNoSessionSinceLinked =
    input.lastSessionOn === null || input.lastSessionOn < input.linkedOn;

  if (hasNoSessionSinceLinked) {
    return {
      kind: "no_recent_session",
      message: `Nessuna sessione da quando è cliente (${days} giorni)`,
    };
  }

  return { kind: "no_recent_session", message: `Nessuna sessione da ${days} giorni` };
};

const isReason = (reason: ChurnRiskReason | null): reason is ChurnRiskReason => reason !== null;

/**
 * High when the subscription is due within 14 days and the client trains little or not at all;
 * medium with only one of the two. Low frequency and no recent session are one condition
 * (the activity), so together without the subscription they stay medium, with two reasons.
 */
export const churnRisk = (input: {
  subscription: { status: SubscriptionStatus; daysLeft: number } | null;
  last14Days: TrainingFrequency;
  lastSessionOn: string | null;
  linkedOn: string;
  today: string;
}): ChurnRisk | null => {
  if (input.subscription?.status === "paused") {
    return null;
  }

  const dueReason = subscriptionReason(input.subscription);
  const activityReasons = [lowFrequencyReason(input.last14Days), noRecentSessionReason(input)].filter(
    isReason,
  );
  const isSubscriptionDue = dueReason !== null;
  const isActivityLow = activityReasons.length > 0;

  if (!isSubscriptionDue && !isActivityLow) {
    return null;
  }

  const level = isSubscriptionDue && isActivityLow ? "high" : "medium";
  const reasons = [dueReason, ...activityReasons].filter(isReason);

  return { level, reasons };
};
