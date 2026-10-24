import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "../db";
import { isUniqueViolation } from "../db/errors";
import {
  clientSubscriptions,
  coachAthletes,
  coachOffers,
  subscriptionPauses,
  subscriptionPayments,
} from "../db/schema";
import {
  applyPause,
  coverageForPayment,
  dayOfMonth,
  hasSubscriptionEnded,
  paymentPreview,
  paymentUndo,
  pauseRemoval,
  subscriptionState,
  termsAfterOfferChange,
  type PauseDates,
  type PauseRemoval,
} from "./subscription";
import {
  validateNewSubscription,
  validateSubscriptionUpdate,
  type OfferInput,
  type OfferPatch,
  type PaymentInput,
  type PaymentPreviewQuery,
  type SubscriptionInput,
} from "./subscriptionValidation";

type Reader = Pick<typeof db, "select">;

type Failure = { ok: false; status: 400 | 404 | 409; error: string };
type Result<T> = { ok: true; value: T } | Failure;

type SubscriptionRow = typeof clientSubscriptions.$inferSelect;
type PaymentRow = typeof subscriptionPayments.$inferSelect;
type PauseRow = typeof subscriptionPauses.$inferSelect;
type OfferRow = typeof coachOffers.$inferSelect;

type SubscriptionTerms = Partial<
  Pick<
    SubscriptionRow,
    | "offerId"
    | "agreedPriceCents"
    | "periodUnit"
    | "periodCount"
    | "isRecurring"
    | "billingDay"
    | "revision"
  >
>;

// Many 12 × 52-week payments would push toISOString() past year 9999, a string Postgres rejects.
const LATEST_PAID_THROUGH = "2199-12-31";

const CLIENT_NOT_FOUND: Failure = { ok: false, status: 404, error: "Client not found" };
const SUBSCRIPTION_NOT_FOUND: Failure = { ok: false, status: 404, error: "Subscription not found" };
const SUBSCRIPTION_ENDED: Failure = { ok: false, status: 409, error: "Subscription has ended" };
const PAYMENT_NOT_FOUND: Failure = { ok: false, status: 404, error: "Payment not found" };
const OUT_OF_RANGE: Failure = {
  ok: false,
  status: 400,
  error: "Resulting paidThrough is out of range",
};

const NO_SUBSCRIPTION = { subscription: null, state: null, activePause: null };

const badRequest = (error: string): Failure => ({ ok: false, status: 400, error });
const conflict = (error: string): Failure => ({ ok: false, status: 409, error });

const offerColumns = {
  id: coachOffers.id,
  name: coachOffers.name,
  priceCents: coachOffers.priceCents,
  periodUnit: coachOffers.periodUnit,
  periodCount: coachOffers.periodCount,
  isRecurring: coachOffers.isRecurring,
  archivedAt: coachOffers.archivedAt,
  createdAt: coachOffers.createdAt,
  updatedAt: coachOffers.updatedAt,
};

// `coachId`, `revision` and `previous_*` stay inside: `canUndo` and `canRemove` summarize them.
const toSubscription = (row: SubscriptionRow) => ({
  id: row.id,
  athleteId: row.athleteId,
  offerId: row.offerId,
  agreedPriceCents: row.agreedPriceCents,
  periodUnit: row.periodUnit,
  periodCount: row.periodCount,
  isRecurring: row.isRecurring,
  startedOn: row.startedOn,
  paidThrough: row.paidThrough,
  billingDay: row.billingDay,
  endedOn: row.endedOn,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toPayment = (row: PaymentRow, canUndo: boolean) => ({
  id: row.id,
  amountCents: row.amountCents,
  paidOn: row.paidOn,
  method: row.method,
  periods: row.periods,
  coversFrom: row.coversFrom,
  coversTo: row.coversTo,
  note: row.note,
  canUndo,
  createdAt: row.createdAt,
});

const toPause = (row: PauseRow, subscription: SubscriptionRow, today: string) => ({
  id: row.id,
  startsOn: row.startsOn,
  endsOn: row.endsOn,
  canRemove: pauseRemoval({ pause: row, subscription, today }).ok,
  createdAt: row.createdAt,
});

const pausesOverlap = (first: PauseDates, second: PauseDates): boolean =>
  first.startsOn <= second.endsOn && second.startsOn <= first.endsOn;

/** Creating a pause is refused while another has not ended, so at most one is active. */
const findActivePause = (livePauses: PauseRow[], today: string): PauseRow | null =>
  livePauses.find((pause) => pause.endsOn >= today) ?? null;

const isOfCoachAndAthlete = (coachId: number, athleteId: number) =>
  and(eq(clientSubscriptions.coachId, coachId), eq(clientSubscriptions.athleteId, athleteId));

export const findSubscription = async (coachId: number, athleteId: number) => {
  const [row] = await db
    .select()
    .from(clientSubscriptions)
    .where(isOfCoachAndAthlete(coachId, athleteId));

  return row ?? null;
};

/**
 * Every write reads the subscription under this lock, then checks its state on what it read.
 * The link comes first, shared, as in unlinking (which takes it exclusively): a write and an
 * unlink at once never leave an open subscription to an ex client, not even a new one.
 */
const lockSubscription = async (
  tx: Tx,
  coachId: number,
  athleteId: number,
): Promise<Result<SubscriptionRow | null>> => {
  const [link] = await tx
    .select({ id: coachAthletes.id })
    .from(coachAthletes)
    .where(and(eq(coachAthletes.coachId, coachId), eq(coachAthletes.athleteId, athleteId)))
    .for("share");

  if (!link) {
    return CLIENT_NOT_FOUND;
  }

  const [row] = await tx
    .select()
    .from(clientSubscriptions)
    .where(isOfCoachAndAthlete(coachId, athleteId))
    .for("update");

  return { ok: true, value: row ?? null };
};

const listLivePauses = (reader: Reader, subscriptionId: number) =>
  reader
    .select()
    .from(subscriptionPauses)
    .where(
      and(eq(subscriptionPauses.subscriptionId, subscriptionId), isNull(subscriptionPauses.cancelledAt)),
    )
    .orderBy(desc(subscriptionPauses.startsOn));

const buildSubscriptionDetail = async (
  reader: Reader,
  subscription: SubscriptionRow,
  today: string,
) => {
  const livePauses = await listLivePauses(reader, subscription.id);
  const activePause = findActivePause(livePauses, today);
  const state = subscriptionState({
    paidThrough: subscription.paidThrough,
    endedOn: subscription.endedOn,
    today,
    activePause,
  });

  if (activePause === null) {
    return { subscription: toSubscription(subscription), state, activePause: null };
  }

  return {
    subscription: toSubscription(subscription),
    state,
    activePause: toPause(activePause, subscription, today),
  };
};

export const listOffers = (coachId: number) =>
  db
    .select(offerColumns)
    .from(coachOffers)
    .where(eq(coachOffers.coachId, coachId))
    .orderBy(sql`${coachOffers.archivedAt} is not null`, asc(coachOffers.name), asc(coachOffers.id));

export const createOffer = async (coachId: number, input: OfferInput) => {
  const [offer] = await db
    .insert(coachOffers)
    .values({ coachId, ...input })
    .returning(offerColumns);

  return offer;
};

/** Archiving twice keeps the first date. */
const archivedAtUpdate = (archived: boolean | undefined) => {
  if (archived === undefined) {
    return undefined;
  }

  if (archived) {
    return sql`coalesce(${coachOffers.archivedAt}, now())`;
  }

  return null;
};

export const updateOffer = async (coachId: number, offerId: number, patch: OfferPatch) => {
  const [offer] = await db
    .update(coachOffers)
    .set({
      name: patch.name,
      priceCents: patch.priceCents,
      periodUnit: patch.periodUnit,
      periodCount: patch.periodCount,
      isRecurring: patch.isRecurring,
      archivedAt: archivedAtUpdate(patch.archived),
      updatedAt: new Date(),
    })
    .where(and(eq(coachOffers.id, offerId), eq(coachOffers.coachId, coachId)))
    .returning(offerColumns);

  return offer ?? null;
};

/**
 * Writes for an ex client answer 404, so their pause cannot be removed, also while a
 * subscription that starts in the future is not `ended` yet.
 */
export const loadSubscriptionDetail = async (
  coachId: number,
  athleteId: number,
  today: string,
  isFormerClient: boolean,
) => {
  const subscription = await findSubscription(coachId, athleteId);

  if (subscription === null) {
    return NO_SUBSCRIPTION;
  }

  const detail = await buildSubscriptionDetail(db, subscription, today);

  if (isFormerClient && detail.activePause !== null) {
    return { ...detail, activePause: { ...detail.activePause, canRemove: false } };
  }

  return detail;
};

/** Another coach's offer is "not found": we do not reveal that it exists. */
const findUsableOffer = async (
  tx: Tx,
  coachId: number,
  offerId: number,
): Promise<Result<OfferRow>> => {
  const [offer] = await tx
    .select()
    .from(coachOffers)
    .where(and(eq(coachOffers.id, offerId), eq(coachOffers.coachId, coachId)));

  if (!offer) {
    return { ok: false, status: 404, error: "Offer not found" };
  }

  if (offer.archivedAt !== null) {
    return conflict("Offer is archived");
  }

  return { ok: true, value: offer };
};

type SavedSubscription = {
  isCreated: boolean;
  detail: Awaited<ReturnType<typeof buildSubscriptionDetail>>;
};

const insertSubscription = async (
  tx: Tx,
  coachId: number,
  athleteId: number,
  input: SubscriptionInput,
  today: string,
): Promise<Result<SavedSubscription>> => {
  const terms = validateNewSubscription(input);

  if (!terms.ok) {
    return badRequest(terms.error);
  }

  const offer = await findUsableOffer(tx, coachId, terms.value.offerId);

  if (!offer.ok) {
    return offer;
  }

  const [row] = await tx
    .insert(clientSubscriptions)
    .values({
      coachId,
      athleteId,
      offerId: offer.value.id,
      agreedPriceCents: terms.value.agreedPriceCents ?? offer.value.priceCents,
      periodUnit: offer.value.periodUnit,
      periodCount: offer.value.periodCount,
      isRecurring: offer.value.isRecurring,
      startedOn: terms.value.startedOn,
      paidThrough: terms.value.paidThrough,
      billingDay: dayOfMonth(terms.value.paidThrough),
      endedOn: terms.value.endedOn,
    })
    .returning();

  const detail = await buildSubscriptionDetail(tx, row, today);

  return { ok: true, value: { isCreated: true, detail } };
};

/** The same offer id copies nothing, so an archived offer still allows a price change. */
const termsForUpdate = async (
  tx: Tx,
  coachId: number,
  saved: SubscriptionRow,
  input: SubscriptionInput,
): Promise<Result<SubscriptionTerms>> => {
  const newOfferId = input.offerId;
  const isOfferChange = newOfferId !== undefined && newOfferId !== saved.offerId;

  if (!isOfferChange) {
    return {
      ok: true,
      value: { agreedPriceCents: input.agreedPriceCents ?? saved.agreedPriceCents },
    };
  }

  const offer = await findUsableOffer(tx, coachId, newOfferId);

  if (!offer.ok) {
    return offer;
  }

  const terms = termsAfterOfferChange({
    subscription: saved,
    offer: offer.value,
    agreedPriceCents: input.agreedPriceCents,
  });

  return { ok: true, value: terms };
};

const updateSubscription = async (
  tx: Tx,
  coachId: number,
  saved: SubscriptionRow,
  input: SubscriptionInput,
  today: string,
): Promise<Result<SavedSubscription>> => {
  const dates = validateSubscriptionUpdate(input, saved);

  if (!dates.ok) {
    return badRequest(dates.error);
  }

  const terms = await termsForUpdate(tx, coachId, saved, input);

  if (!terms.ok) {
    return terms;
  }

  // A new start moves the revision like a new period unit (once, also when both change):
  // undoing an earlier change could bring paidThrough back before the new start.
  const isStartChange = dates.value.startedOn !== saved.startedOn;
  const revision = isStartChange ? saved.revision + 1 : terms.value.revision;

  const [row] = await tx
    .update(clientSubscriptions)
    .set({ ...terms.value, ...dates.value, revision, updatedAt: new Date() })
    .where(eq(clientSubscriptions.id, saved.id))
    .returning();

  const detail = await buildSubscriptionDetail(tx, row, today);

  return { ok: true, value: { isCreated: false, detail } };
};

/** One row per coach and athlete: ending and resuming happen on the same row. */
export const saveSubscription = async (
  coachId: number,
  athleteId: number,
  input: SubscriptionInput,
  today: string,
): Promise<Result<SavedSubscription>> => {
  try {
    return await db.transaction(async (tx) => {
      const locked = await lockSubscription(tx, coachId, athleteId);

      if (!locked.ok) {
        return locked;
      }

      if (locked.value === null) {
        return insertSubscription(tx, coachId, athleteId, input, today);
      }

      return updateSubscription(tx, coachId, locked.value, input, today);
    });
  } catch (error) {
    // Two creations at once: the lock finds no row to wait on, the unique pair stops the second.
    if (isUniqueViolation(error)) {
      return conflict("Subscription already exists");
    }

    throw error;
  }
};

export const loadPaymentPreview = async (
  coachId: number,
  athleteId: number,
  query: PaymentPreviewQuery,
) => {
  const subscription = await findSubscription(coachId, athleteId);

  if (subscription === null) {
    return SUBSCRIPTION_NOT_FOUND;
  }

  const preview = paymentPreview({
    paidThrough: subscription.paidThrough,
    paidOn: query.paidOn,
    period: subscription,
    periods: query.periods,
  });

  return {
    ok: true as const,
    value: {
      paidOn: query.paidOn,
      periods: query.periods,
      suggestedStart: preview.suggestedStart,
      suggestedAmountCents: subscription.agreedPriceCents * query.periods,
      options: preview.options,
    },
  };
};

/** As for the pause, an ex client cannot undo a payment, whatever the subscription dates say. */
export const listPayments = async (
  coachId: number,
  athleteId: number,
  today: string,
  isFormerClient: boolean,
) => {
  const subscription = await findSubscription(coachId, athleteId);

  if (subscription === null) {
    return [];
  }

  const payments = await db
    .select()
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.subscriptionId, subscription.id))
    .orderBy(desc(subscriptionPayments.paidOn), desc(subscriptionPayments.id));

  // The latest payment is the last one recorded, not the one with the latest paidOn.
  const latestPaymentId = Math.max(...payments.map((payment) => payment.id));

  return payments.map((payment) => {
    const undo = paymentUndo({ payment, latestPaymentId, subscription, today });
    return toPayment(payment, !isFormerClient && undo.ok);
  });
};

export const recordPayment = (
  coachId: number,
  athleteId: number,
  input: PaymentInput,
  today: string,
) =>
  db.transaction(async (tx) => {
    const locked = await lockSubscription(tx, coachId, athleteId);

    if (!locked.ok) {
      return locked;
    }

    const subscription = locked.value;

    if (subscription === null) {
      return SUBSCRIPTION_NOT_FOUND;
    }

    if (hasSubscriptionEnded(subscription.endedOn, today)) {
      return SUBSCRIPTION_ENDED;
    }

    const preview = paymentPreview({
      paidThrough: subscription.paidThrough,
      paidOn: input.paidOn,
      period: subscription,
      periods: input.periods,
    });
    const start = input.start ?? preview.suggestedStart;
    const isAllowed = preview.options.some((option) => option.start === start && option.isAllowed);

    if (!isAllowed) {
      return badRequest("Payment would shorten the paid period");
    }

    const coverage = coverageForPayment({
      paidThrough: subscription.paidThrough,
      paidOn: input.paidOn,
      start,
      period: subscription,
      periods: input.periods,
    });

    if (coverage.coversTo > LATEST_PAID_THROUGH) {
      return OUT_OF_RANGE;
    }

    const revision = subscription.revision + 1;
    const [payment] = await tx
      .insert(subscriptionPayments)
      .values({
        subscriptionId: subscription.id,
        amountCents: input.amountCents,
        paidOn: input.paidOn,
        method: input.method,
        periods: input.periods,
        coversFrom: coverage.coversFrom,
        coversTo: coverage.coversTo,
        note: input.note,
        previousPaidThrough: subscription.paidThrough,
        previousBillingDay: subscription.billingDay,
        revision,
      })
      .returning();

    const [updated] = await tx
      .update(clientSubscriptions)
      .set({
        paidThrough: coverage.coversTo,
        billingDay: coverage.billingDay,
        revision,
        updatedAt: new Date(),
      })
      .where(eq(clientSubscriptions.id, subscription.id))
      .returning();

    const undo = paymentUndo({ payment, latestPaymentId: payment.id, subscription: updated, today });

    return {
      ok: true as const,
      value: {
        payment: toPayment(payment, undo.ok),
        subscription: toSubscription(updated),
        start,
      },
    };
  });

/** A payment of another client, or of another coach, is "not found" like a missing one. */
export const undoPayment = (
  coachId: number,
  athleteId: number,
  paymentId: number,
  today: string,
) =>
  db.transaction(async (tx) => {
    const locked = await lockSubscription(tx, coachId, athleteId);

    if (!locked.ok) {
      return locked;
    }

    const subscription = locked.value;

    if (subscription === null) {
      return PAYMENT_NOT_FOUND;
    }

    const [payment] = await tx
      .select()
      .from(subscriptionPayments)
      .where(
        and(
          eq(subscriptionPayments.id, paymentId),
          eq(subscriptionPayments.subscriptionId, subscription.id),
        ),
      );

    if (!payment) {
      return PAYMENT_NOT_FOUND;
    }

    const [latestPayment] = await tx
      .select({ id: subscriptionPayments.id })
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.subscriptionId, subscription.id))
      .orderBy(desc(subscriptionPayments.id))
      .limit(1);

    const undo = paymentUndo({
      payment,
      latestPaymentId: latestPayment.id,
      subscription,
      today,
    });

    if (!undo.ok) {
      return conflict(undo.error);
    }

    await tx
      .update(clientSubscriptions)
      .set({ ...undo.value, updatedAt: new Date() })
      .where(eq(clientSubscriptions.id, subscription.id));

    await tx.delete(subscriptionPayments).where(eq(subscriptionPayments.id, payment.id));

    return { ok: true as const, value: null };
  });

export const createPause = (
  coachId: number,
  athleteId: number,
  dates: PauseDates,
  today: string,
) =>
  db.transaction(async (tx) => {
    const locked = await lockSubscription(tx, coachId, athleteId);

    if (!locked.ok) {
      return locked;
    }

    const subscription = locked.value;

    if (subscription === null) {
      return SUBSCRIPTION_NOT_FOUND;
    }

    if (dates.startsOn < subscription.startedOn) {
      return badRequest("startsOn must be on or after startedOn");
    }

    if (hasSubscriptionEnded(subscription.endedOn, today)) {
      return SUBSCRIPTION_ENDED;
    }

    const livePauses = await listLivePauses(tx, subscription.id);

    if (findActivePause(livePauses, today) !== null) {
      return conflict("Subscription already has an active pause");
    }

    const overlapsAnotherPause = livePauses.some((pause) => pausesOverlap(pause, dates));

    if (overlapsAnotherPause) {
      return conflict("Pause overlaps another pause");
    }

    const shifted = applyPause({
      paidThrough: subscription.paidThrough,
      billingDay: subscription.billingDay,
      pause: dates,
    });

    if (shifted.paidThrough > LATEST_PAID_THROUGH) {
      return OUT_OF_RANGE;
    }

    const revision = subscription.revision + 1;
    const [pause] = await tx
      .insert(subscriptionPauses)
      .values({
        subscriptionId: subscription.id,
        startsOn: dates.startsOn,
        endsOn: dates.endsOn,
        previousPaidThrough: subscription.paidThrough,
        previousBillingDay: subscription.billingDay,
        revision,
      })
      .returning();

    const [updated] = await tx
      .update(clientSubscriptions)
      .set({ ...shifted, revision, updatedAt: new Date() })
      .where(eq(clientSubscriptions.id, subscription.id))
      .returning();

    return {
      ok: true as const,
      value: { pause: toPause(pause, updated, today), subscription: toSubscription(updated) },
    };
  });

const writePauseRemoval = async (
  tx: Tx,
  subscriptionId: number,
  pauseId: number,
  removal: PauseRemoval,
) => {
  await tx
    .update(clientSubscriptions)
    .set({
      paidThrough: removal.paidThrough,
      billingDay: removal.billingDay,
      revision: removal.revision,
      updatedAt: new Date(),
    })
    .where(eq(clientSubscriptions.id, subscriptionId));

  if (removal.action === "cancel") {
    await tx
      .update(subscriptionPauses)
      .set({ cancelledAt: new Date() })
      .where(eq(subscriptionPauses.id, pauseId));
    return;
  }

  await tx
    .update(subscriptionPauses)
    .set({ endsOn: removal.endsOn, revision: removal.revision })
    .where(eq(subscriptionPauses.id, pauseId));
};

export const removeActivePause = (coachId: number, athleteId: number, today: string) =>
  db.transaction(async (tx) => {
    const locked = await lockSubscription(tx, coachId, athleteId);

    if (!locked.ok) {
      return locked;
    }

    const subscription = locked.value;

    if (subscription === null) {
      return SUBSCRIPTION_NOT_FOUND;
    }

    if (hasSubscriptionEnded(subscription.endedOn, today)) {
      return SUBSCRIPTION_ENDED;
    }

    const livePauses = await listLivePauses(tx, subscription.id);
    const activePause = findActivePause(livePauses, today);

    if (activePause === null && livePauses.length > 0) {
      return conflict("Pause has already ended");
    }

    if (activePause === null) {
      return { ok: false as const, status: 404 as const, error: "No active pause" };
    }

    const removal = pauseRemoval({ pause: activePause, subscription, today });

    if (!removal.ok) {
      return conflict(removal.error);
    }

    await writePauseRemoval(tx, subscription.id, activePause.id, removal.value);

    return { ok: true as const, value: null };
  });
