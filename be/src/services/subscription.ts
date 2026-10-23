import type { PeriodUnit } from "../db/schema/coachoffers";
import { addRomeDays } from "./stats";

const EXPIRING_WINDOW_DAYS = 7;
const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 86_400_000;

type BillingCycle = {
  periodUnit: PeriodUnit;
  periodCount: number;
  billingDay: number;
};

type PauseDates = {
  startsOn: string;
  endsOn: string;
};

/** Where a new payment starts: the end of the paid period, or the day it was paid. */
type PaymentStart = "paid_through" | "paid_on";

type SubscriptionStatus = "active" | "expiring" | "expired" | "paused";

type SubscriptionState = {
  status: SubscriptionStatus;
  daysLeft: number;
  pausedUntil: string | null;
};

const lastDayOfMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const dayOfMonth = (dateKey: string): number => {
  const [, , day] = dateKey.split("-").map(Number);
  return day;
};

const daysBetween = (from: string, to: string): number =>
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

/** A pause moves the end of the paid period, and the billing day follows it. */
export const applyPause = (
  paidThrough: string,
  pause: PauseDates,
): { paidThrough: string; billingDay: number } => {
  const shiftedPaidThrough = addRomeDays(paidThrough, pauseLengthDays(pause));

  return { paidThrough: shiftedPaidThrough, billingDay: dayOfMonth(shiftedPaidThrough) };
};

const isPauseRunning = (pause: PauseDates, today: string): boolean =>
  pause.startsOn <= today && today <= pause.endsOn;

/** `activePause` is the pause that is not cancelled, if any. */
export const subscriptionState = (input: {
  paidThrough: string;
  today: string;
  activePause: PauseDates | null;
}): SubscriptionState => {
  const daysLeft = daysBetween(input.today, input.paidThrough);

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
