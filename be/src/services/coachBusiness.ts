import type { PeriodUnit } from "../db/schema/coachoffers";
import { addPeriods, hasSubscriptionEnded, subscriptionState, type PauseDates } from "./subscription";
import { addRomeDays } from "./stats";

/** The months of the business page: the current one and the ones before it. */
const BUSINESS_RANGES = ["6m", "12m"] as const;
export type BusinessRange = (typeof BUSINESS_RANGES)[number];

const MONTHS_IN_RANGE: Record<BusinessRange, number> = { "6m": 6, "12m": 12 };

const EXPECTED_WINDOW_DAYS = 30;
const RENEWAL_WINDOW_DAYS = 90;

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;
// A one-week period renews at most 5 times in 30 days (day 0, 7, 14, 21, 28).
const MAX_RENEWALS_IN_EXPECTED_WINDOW = 5;

export type BusinessSubscription = {
  id: number;
  agreedPriceCents: number;
  periodUnit: PeriodUnit;
  periodCount: number;
  billingDay: number;
  isRecurring: boolean;
  startedOn: string;
  paidThrough: string;
  endedOn: string | null;
  /** The pause not cancelled that covers today, if any. */
  runningPause: PauseDates | null;
};

export type BusinessPayment = {
  subscriptionId: number;
  amountCents: number;
  paidOn: string;
  coversFrom: string;
  /** Null on rows written before 0015. */
  previousPaidThrough: string | null;
};

export type CoachBusiness = {
  range: BusinessRange;
  today: string;
  subscriptionCount: number;
  monthlyRecurringCents: number;
  recurringClientCount: number;
  expectedNext30DaysCents: number;
  collectedByMonth: { month: string; amountCents: number }[];
  renewals90Days: { due: number; renewed: number };
  lostByMonth: { month: string; count: number }[];
};

/** Absent is the default range; anything else, a repeated value included, is null. */
export const parseBusinessRange = (value: unknown): BusinessRange | null => {
  if (value === undefined) {
    return "6m";
  }

  return BUSINESS_RANGES.find((range) => range === value) ?? null;
};

const monthOf = (dateKey: string): string => dateKey.slice(0, 7);

/** `count` months ending with the month of `today`, oldest first: "2026-11" with 3 → 09, 10, 11. */
const monthsUntil = (today: string, count: number): string[] => {
  const [year, month] = today.split("-").map(Number);

  return Array.from({ length: count }, (_, index) => {
    const monthsBack = count - 1 - index;
    const firstOfMonth = new Date(Date.UTC(year, month - 1 - monthsBack, 1));
    return firstOfMonth.toISOString().slice(0, 7);
  });
};

export const businessMonths = (today: string, range: BusinessRange): string[] =>
  monthsUntil(today, MONTHS_IN_RANGE[range]);

/** The first day the page reads payments for. */
export const firstDayOfRange = (today: string, range: BusinessRange): string => {
  const [firstMonth] = businessMonths(today, range);
  return `${firstMonth}-01`;
};

export const renewalWindowStart = (today: string): string =>
  addRomeDays(today, -(RENEWAL_WINDOW_DAYS - 1));

/** What one subscription is worth in an average month, rounded to the nearest whole cent. */
export const monthlyAmountCents = (
  subscription: Pick<BusinessSubscription, "agreedPriceCents" | "periodUnit" | "periodCount">,
): number => {
  if (subscription.periodUnit === "week") {
    const yearlyCents = subscription.agreedPriceCents * WEEKS_PER_YEAR;
    return Math.round(yearlyCents / MONTHS_PER_YEAR / subscription.periodCount);
  }

  return Math.round(subscription.agreedPriceCents / subscription.periodCount);
};

const isPausedToday = (subscription: BusinessSubscription, today: string): boolean => {
  const state = subscriptionState({
    paidThrough: subscription.paidThrough,
    endedOn: subscription.endedOn,
    today,
    activePause: subscription.runningPause,
  });

  return state.status === "paused";
};

/** Renews by itself, has not ended and is not paused: an expired one still counts. */
const isRunningRecurring = (subscription: BusinessSubscription, today: string): boolean =>
  subscription.isRecurring &&
  !hasSubscriptionEnded(subscription.endedOn, today) &&
  !isPausedToday(subscription, today);

export const monthlyRecurring = (
  subscriptions: BusinessSubscription[],
  today: string,
): { cents: number; clientCount: number } => {
  const counted = subscriptions.filter((subscription) => isRunningRecurring(subscription, today));
  const cents = counted.reduce((total, subscription) => total + monthlyAmountCents(subscription), 0);

  return { cents, clientCount: counted.length };
};

/** Renewal dates from `paidThrough` on that fall between `from` and `to`, both included. */
export const renewalDatesBetween = (
  subscription: BusinessSubscription,
  from: string,
  to: string,
): string[] => {
  const period = {
    periodUnit: subscription.periodUnit,
    periodCount: subscription.periodCount,
    billingDay: subscription.billingDay,
  };
  // The first renewal is paidThrough itself: zero periods would still move it to the billing day.
  const laterRenewals = Array.from({ length: MAX_RENEWALS_IN_EXPECTED_WINDOW - 1 }, (_, index) =>
    addPeriods(subscription.paidThrough, period, index + 1),
  );
  const candidates = [subscription.paidThrough, ...laterRenewals];

  // No renewal from the end date on: the client has left by then.
  return candidates.filter((date) => {
    const isInWindow = from <= date && date <= to;
    const isBeforeEnd = subscription.endedOn === null || date < subscription.endedOn;
    return isInWindow && isBeforeEnd;
  });
};

/** Expired subscriptions stay out: that payment is already late, Today shows it. */
export const expectedNext30DaysCents = (
  subscriptions: BusinessSubscription[],
  today: string,
): number => {
  const windowEnd = addRomeDays(today, EXPECTED_WINDOW_DAYS - 1);
  const counted = subscriptions.filter(
    (subscription) => isRunningRecurring(subscription, today) && subscription.paidThrough >= today,
  );

  return counted.reduce((total, subscription) => {
    const renewalCount = renewalDatesBetween(subscription, today, windowEnd).length;
    return total + renewalCount * subscription.agreedPriceCents;
  }, 0);
};

export const collectedByMonth = (
  payments: BusinessPayment[],
  months: string[],
): { month: string; amountCents: number }[] =>
  months.map((month) => {
    const ofMonth = payments.filter((payment) => monthOf(payment.paidOn) === month);
    const amountCents = ofMonth.reduce((total, payment) => total + payment.amountCents, 0);
    return { month, amountCents };
  });

/** A future end date is not a loss yet. */
export const lostByMonth = (
  subscriptions: BusinessSubscription[],
  months: string[],
  today: string,
): { month: string; count: number }[] =>
  months.map((month) => {
    const count = subscriptions.filter((subscription) => {
      const hasEnded = hasSubscriptionEnded(subscription.endedOn, today);
      return hasEnded && subscription.endedOn !== null && monthOf(subscription.endedOn) === month;
    }).length;
    return { month, count };
  });

/** The first payment of a subscription is not a renewal: nothing was paid before it. */
const isRenewalPayment = (payment: BusinessPayment, subscription: BusinessSubscription): boolean => {
  const paidUntilBefore = payment.previousPaidThrough ?? payment.coversFrom;
  return paidUntilBefore > subscription.startedOn;
};

/** Paid through a day before today and not paused: the client is late. */
const isExpiredToday = (subscription: BusinessSubscription, today: string): boolean =>
  subscription.paidThrough < today && !isPausedToday(subscription, today);

/**
 * Recurring subscriptions with a due date in the last 90 days (today included), each counted
 * once. Renewed: a renewal payment starts in the window and the client is not late today
 * (paid through today or later, or paused). Missed: paid through a day in the window before
 * today, ended ones included. Renewed and then late again is missed.
 */
export const renewalsLast90Days = (
  subscriptions: BusinessSubscription[],
  payments: BusinessPayment[],
  today: string,
): { due: number; renewed: number } => {
  const windowStart = renewalWindowStart(today);
  const isInWindow = (date: string): boolean => windowStart <= date && date <= today;
  const recurring = subscriptions.filter((subscription) => subscription.isRecurring);

  const hasRenewalInWindow = (subscription: BusinessSubscription): boolean =>
    payments.some(
      (payment) =>
        payment.subscriptionId === subscription.id &&
        isInWindow(payment.coversFrom) &&
        isRenewalPayment(payment, subscription),
    );

  const missed = recurring.filter(
    (subscription) => isInWindow(subscription.paidThrough) && isExpiredToday(subscription, today),
  ).length;

  const renewed = recurring.filter(
    (subscription) => hasRenewalInWindow(subscription) && !isExpiredToday(subscription, today),
  ).length;

  return { due: renewed + missed, renewed };
};

export const buildCoachBusiness = (input: {
  range: BusinessRange;
  today: string;
  subscriptions: BusinessSubscription[];
  payments: BusinessPayment[];
}): CoachBusiness => {
  const months = businessMonths(input.today, input.range);
  const recurring = monthlyRecurring(input.subscriptions, input.today);

  return {
    range: input.range,
    today: input.today,
    subscriptionCount: input.subscriptions.length,
    monthlyRecurringCents: recurring.cents,
    recurringClientCount: recurring.clientCount,
    expectedNext30DaysCents: expectedNext30DaysCents(input.subscriptions, input.today),
    collectedByMonth: collectedByMonth(input.payments, months),
    renewals90Days: renewalsLast90Days(input.subscriptions, input.payments, input.today),
    lostByMonth: lostByMonth(input.subscriptions, months, input.today),
  };
};
