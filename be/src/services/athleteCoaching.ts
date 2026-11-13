import type { SubscriptionStatus } from "./subscription";

/** What the athlete sees of their coaching: never a price, an offer or a payment. */
export type AthleteCoaching = {
  coachName: string | null;
  status: SubscriptionStatus;
  paidThrough: string;
  daysLeft: number;
  pausedUntil: string | null;
};

/**
 * The subscription detail the coach reads for the same pair (`loadSubscriptionDetail`):
 * starting from it, the athlete and the coach always see the same state.
 */
type CoachSubscriptionDetail = {
  subscription: { paidThrough: string } | null;
  state: { status: SubscriptionStatus; daysLeft: number; pausedUntil: string | null } | null;
};

/** `null` without a linked coach, or when the current coach has no subscription for the athlete. */
export const athleteCoachingFrom = (
  coach: { name: string | null } | null,
  detail: CoachSubscriptionDetail | null,
): AthleteCoaching | null => {
  if (coach === null || detail === null) {
    return null;
  }

  if (detail.subscription === null || detail.state === null) {
    return null;
  }

  return {
    coachName: coach.name,
    status: detail.state.status,
    paidThrough: detail.subscription.paidThrough,
    daysLeft: detail.state.daysLeft,
    pausedUntil: detail.state.pausedUntil,
  };
};
