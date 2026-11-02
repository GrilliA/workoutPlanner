import type { PeriodUnit } from "../db/schema/coachoffers";
import { dayBefore } from "./assignmentStatus";
import { addRomeDays } from "./stats";

const EXPIRING_WINDOW_DAYS = 7;
const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 86_400_000;

type BillingCycle = {
  periodUnit: PeriodUnit;
  periodCount: number;
  billingDay: number;
};

export type PauseDates = {
  startsOn: string;
  endsOn: string;
};

/** Where a new payment starts: the end of the paid period, or the day it was paid. */
export const PAYMENT_STARTS = ["paid_through", "paid_on"] as const;
export type PaymentStart = (typeof PAYMENT_STARTS)[number];

export type SubscriptionStatus = "active" | "expiring" | "expired" | "paused" | "ended";

type SubscriptionState = {
  status: SubscriptionStatus;
  daysLeft: number;
  pausedUntil: string | null;
};

const lastDayOfMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

export const dayOfMonth = (dateKey: string): number => {
  const [, , day] = dateKey.split("-").map(Number);
  return day;
};

export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);

const addMonths = (dateKey: string, months: number, billingDay: number): string => {
  const [year, month] = dateKey.split("-").map(Number);
  const firstOfTargetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = firstOfTargetMonth.getUTCFullYear();
  const targetMonthIndex = firstOfTargetMonth.getUTCMonth();
  // Billing day 31 lands on 28 February, then back on 31 March.
  const targetDay = Math.min(billingDay, lastDayOfMonth(targetYear, targetMonthIndex));

  return new Date(Date.UTC(targetYear, targetMonthIndex, targetDay)).toISOString().slice(0, 10);
};

export const addPeriods = (
  dateKey: string,
  period: BillingCycle,
  periods: number,
): string => {
  const unitCount = period.periodCount * periods;

  if (period.periodUnit === "week") {
    return addRomeDays(dateKey, unitCount * DAYS_PER_WEEK);
  }

  return addMonths(dateKey, unitCount, period.billingDay);
};

/**
 * A late payment continues from the paid period, so paying late gains no days.
 * A client away for more than a whole period is back, not late: start from the payment day.
 * The coach can still pick the other start in the payment dialog.
 */
export const suggestedPaymentStart = (input: {
  paidThrough: string;
  paidOn: string;
  period: BillingCycle;
}): PaymentStart => {
  const endOfMissedPeriod = addPeriods(input.paidThrough, input.period, 1);
  const isBackAfterLongBreak = input.paidOn > endOfMissedPeriod;

  if (isBackAfterLongBreak) {
    return "paid_on";
  }

  return "paid_through";
};

export const coverageForPayment = (input: {
  paidThrough: string;
  paidOn: string;
  start: PaymentStart;
  period: BillingCycle;
  periods: number;
}): { coversFrom: string; coversTo: string; billingDay: number } => {
  if (input.start === "paid_through") {
    return {
      coversFrom: input.paidThrough,
      coversTo: addPeriods(input.paidThrough, input.period, input.periods),
      billingDay: input.period.billingDay,
    };
  }

  // Starting again on the payment day makes that day the new billing day.
  const restartedPeriod = { ...input.period, billingDay: dayOfMonth(input.paidOn) };

  return {
    coversFrom: input.paidOn,
    coversTo: addPeriods(input.paidOn, restartedPeriod, input.periods),
    billingDay: restartedPeriod.billingDay,
  };
};

export const pauseLengthDays = (pause: PauseDates): number => {
  // Both the first and the last day of the pause count.
  return daysBetween(pause.startsOn, pause.endsOn) + 1;
};

/**
 * Paid days that fall inside the pause are enjoyed after it. A paid period that ends
 * before the pause starts has no such days, so nothing moves.
 * When it reaches the pause, the end moves by the whole pause (also when it falls inside it:
 * `endsOn + paid days in the pause` is the same date) and the billing day follows it.
 */
export const applyPause = (input: {
  paidThrough: string;
  billingDay: number;
  pause: PauseDates;
}): { paidThrough: string; billingDay: number } => {
  const isPaidIntoPause = input.paidThrough >= input.pause.startsOn;

  if (!isPaidIntoPause) {
    return { paidThrough: input.paidThrough, billingDay: input.billingDay };
  }

  const shiftedPaidThrough = addRomeDays(input.paidThrough, pauseLengthDays(input.pause));

  return { paidThrough: shiftedPaidThrough, billingDay: dayOfMonth(shiftedPaidThrough) };
};

/** An end date in the future still lets the coach record payments and pauses until that day. */
export const hasSubscriptionEnded = (endedOn: string | null, today: string): boolean =>
  endedOn !== null && endedOn <= today;

const isPauseRunning = (pause: PauseDates, today: string): boolean =>
  pause.startsOn <= today && today <= pause.endsOn;

/** `activePause` is the pause that is not cancelled, if any. */
export const subscriptionState = (input: {
  paidThrough: string;
  endedOn: string | null;
  today: string;
  activePause: PauseDates | null;
}): SubscriptionState => {
  const daysLeft = daysBetween(input.today, input.paidThrough);

  if (hasSubscriptionEnded(input.endedOn, input.today)) {
    return { status: "ended", daysLeft, pausedUntil: null };
  }

  if (input.activePause !== null && isPauseRunning(input.activePause, input.today)) {
    return { status: "paused", daysLeft, pausedUntil: input.activePause.endsOn };
  }

  if (daysLeft < 0) {
    return { status: "expired", daysLeft, pausedUntil: null };
  }

  if (daysLeft <= EXPIRING_WINDOW_DAYS) {
    return { status: "expiring", daysLeft, pausedUntil: null };
  }

  return { status: "active", daysLeft, pausedUntil: null };
};

/** Both starts the payment dialog can offer; one that would shorten the paid period is not allowed. */
export const paymentPreview = (input: {
  paidThrough: string;
  paidOn: string;
  period: BillingCycle;
  periods: number;
}): {
  suggestedStart: PaymentStart;
  options: { start: PaymentStart; coversFrom: string; coversTo: string; isAllowed: boolean }[];
} => {
  const options = PAYMENT_STARTS.map((start) => {
    const coverage = coverageForPayment({ ...input, start });

    return {
      start,
      coversFrom: coverage.coversFrom,
      coversTo: coverage.coversTo,
      isAllowed: coverage.coversTo >= input.paidThrough,
    };
  });

  return { suggestedStart: suggestedPaymentStart(input), options };
};

type SubscriptionRevision = {
  endedOn: string | null;
  revision: number;
};

/** A payment or a pause, with the subscription values it replaced. */
type RecordedChange = {
  revision: number;
  previousPaidThrough: string | null;
  previousBillingDay: number | null;
};

type RestoredSubscription = {
  paidThrough: string;
  billingDay: number;
  revision: number;
};

type Invalid = { ok: false; error: string };
type Valid<T> = { ok: true; value: T };

/**
 * Only the change that wrote the current revision can be undone: anything after it was
 * computed from its result. Rows written before 0015 have no previous values to restore.
 */
const restoreBeforeChange = (
  change: RecordedChange,
  subscriptionRevision: number,
): Valid<RestoredSubscription> | Invalid => {
  const isLatestChange = change.revision === subscriptionRevision;

  if (!isLatestChange || change.previousPaidThrough === null || change.previousBillingDay === null) {
    return { ok: false, error: "Only the latest change can be undone" };
  }

  return {
    ok: true,
    value: {
      paidThrough: change.previousPaidThrough,
      billingDay: change.previousBillingDay,
      revision: change.revision - 1,
    },
  };
};

/** What undoing a payment writes back, or why it cannot be undone. */
export const paymentUndo = (input: {
  payment: RecordedChange & { id: number };
  latestPaymentId: number;
  subscription: SubscriptionRevision;
  today: string;
}): Valid<RestoredSubscription> | Invalid => {
  if (hasSubscriptionEnded(input.subscription.endedOn, input.today)) {
    return { ok: false, error: "Subscription has ended" };
  }

  if (input.payment.id !== input.latestPaymentId) {
    return { ok: false, error: "Only the latest payment can be undone" };
  }

  return restoreBeforeChange(input.payment, input.subscription.revision);
};

export type PauseRemoval =
  | ({ action: "cancel" } & RestoredSubscription)
  | ({ action: "end_yesterday"; endsOn: string } & RestoredSubscription);

/**
 * A pause that has not started is cancelled and its values restored. A running one ends
 * yesterday: the shorter pause is applied again on the values it replaced, and that is a new
 * change, so the revision moves forward.
 */
export const pauseRemoval = (input: {
  pause: RecordedChange & PauseDates;
  subscription: SubscriptionRevision;
  today: string;
}): Valid<PauseRemoval> | Invalid => {
  if (hasSubscriptionEnded(input.subscription.endedOn, input.today)) {
    return { ok: false, error: "Subscription has ended" };
  }

  if (input.pause.endsOn < input.today) {
    return { ok: false, error: "Pause has already ended" };
  }

  const restored = restoreBeforeChange(input.pause, input.subscription.revision);

  if (!restored.ok) {
    return restored;
  }

  const hasStarted = input.pause.startsOn < input.today;

  if (!hasStarted) {
    return { ok: true, value: { action: "cancel", ...restored.value } };
  }

  const endsOn = dayBefore(input.today);
  const shortened = applyPause({
    paidThrough: restored.value.paidThrough,
    billingDay: restored.value.billingDay,
    pause: { startsOn: input.pause.startsOn, endsOn },
  });

  return {
    ok: true,
    value: {
      action: "end_yesterday",
      endsOn,
      paidThrough: shortened.paidThrough,
      billingDay: shortened.billingDay,
      revision: input.subscription.revision + 1,
    },
  };
};

/**
 * A new offer copies its period, so later price list edits never reach the client.
 * Weeks ignore the billing day: a new period unit restarts it from paidThrough. That moves the
 * revision, because undoing an earlier payment would bring back a billing day of the other unit.
 */
export const termsAfterOfferChange = (input: {
  subscription: { paidThrough: string; periodUnit: PeriodUnit; billingDay: number; revision: number };
  offer: { id: number; priceCents: number; periodUnit: PeriodUnit; periodCount: number; isRecurring: boolean };
  agreedPriceCents: number | undefined;
}) => {
  const isUnitChange = input.offer.periodUnit !== input.subscription.periodUnit;
  const billingDay = isUnitChange ? dayOfMonth(input.subscription.paidThrough) : input.subscription.billingDay;
  const revision = isUnitChange ? input.subscription.revision + 1 : input.subscription.revision;

  return {
    offerId: input.offer.id,
    agreedPriceCents: input.agreedPriceCents ?? input.offer.priceCents,
    periodUnit: input.offer.periodUnit,
    periodCount: input.offer.periodCount,
    isRecurring: input.offer.isRecurring,
    billingDay,
    revision,
  };
};
