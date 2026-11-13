import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "../db";
import { clientSubscriptions, subscriptionPauses, subscriptionPayments } from "../db/schema";
import {
  buildCoachBusiness,
  firstDayOfRange,
  renewalWindowStart,
  type BusinessRange,
} from "./coachBusiness";

/** Every subscription of the coach, ex clients included: they count as lost and their payments as collected. */
const listCoachSubscriptions = (coachId: number) =>
  db
    .select({
      id: clientSubscriptions.id,
      agreedPriceCents: clientSubscriptions.agreedPriceCents,
      periodUnit: clientSubscriptions.periodUnit,
      periodCount: clientSubscriptions.periodCount,
      billingDay: clientSubscriptions.billingDay,
      isRecurring: clientSubscriptions.isRecurring,
      startedOn: clientSubscriptions.startedOn,
      paidThrough: clientSubscriptions.paidThrough,
      endedOn: clientSubscriptions.endedOn,
    })
    .from(clientSubscriptions)
    .where(eq(clientSubscriptions.coachId, coachId));

const listRunningPauses = (coachId: number, today: string) =>
  db
    .select({
      subscriptionId: subscriptionPauses.subscriptionId,
      startsOn: subscriptionPauses.startsOn,
      endsOn: subscriptionPauses.endsOn,
    })
    .from(subscriptionPauses)
    .innerJoin(clientSubscriptions, eq(clientSubscriptions.id, subscriptionPauses.subscriptionId))
    .where(
      and(
        eq(clientSubscriptions.coachId, coachId),
        isNull(subscriptionPauses.cancelledAt),
        lte(subscriptionPauses.startsOn, today),
        gte(subscriptionPauses.endsOn, today),
      ),
    );

/** Payments of the months on the page, plus those that may be renewals of the last 90 days. */
const listBusinessPayments = (coachId: number, today: string, range: BusinessRange) =>
  db
    .select({
      subscriptionId: subscriptionPayments.subscriptionId,
      amountCents: subscriptionPayments.amountCents,
      paidOn: subscriptionPayments.paidOn,
      coversFrom: subscriptionPayments.coversFrom,
      previousPaidThrough: subscriptionPayments.previousPaidThrough,
    })
    .from(subscriptionPayments)
    .innerJoin(clientSubscriptions, eq(clientSubscriptions.id, subscriptionPayments.subscriptionId))
    .where(
      and(
        eq(clientSubscriptions.coachId, coachId),
        or(
          gte(subscriptionPayments.paidOn, firstDayOfRange(today, range)),
          gte(subscriptionPayments.coversFrom, renewalWindowStart(today)),
        ),
      ),
    );

/** Three statements per request, whatever the number of clients. */
export const loadCoachBusiness = async (coachId: number, today: string, range: BusinessRange) => {
  const [subscriptions, runningPauses, payments] = await Promise.all([
    listCoachSubscriptions(coachId),
    listRunningPauses(coachId, today),
    listBusinessPayments(coachId, today, range),
  ]);

  const subscriptionsWithPause = subscriptions.map((subscription) => {
    const pause = runningPauses.find((candidate) => candidate.subscriptionId === subscription.id);
    const runningPause = pause === undefined ? null : { startsOn: pause.startsOn, endsOn: pause.endsOn };
    return { ...subscription, runningPause };
  });

  return buildCoachBusiness({ range, today, subscriptions: subscriptionsWithPause, payments });
};
