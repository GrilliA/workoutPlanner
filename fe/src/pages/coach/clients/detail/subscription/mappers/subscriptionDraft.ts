import type { Offer, Pause, Payment, Subscription, SubscriptionInput } from "@api";
import { formatCentsAsInput, parseEurosToCents } from "@utils/money";
import { isValidDateKey } from "@utils/romeCalendar";

/** The create / edit form of the subscription, as typed. */
export type SubscriptionDraft = {
  /** "" until an offer is picked. */
  offerId: string;
  /** null while the price follows the picked offer. */
  priceText: string | null;
  startedOn: string;
  /** null while it follows `startedOn` (creation only: an edit never sends it). */
  paidThrough: string | null;
};

export type SubscriptionDraftErrors = Partial<
  Record<"offerId" | "price" | "startedOn" | "paidThrough", string>
>;

type ValidSubscriptionDraft = {
  offerId: number | null;
  agreedPriceCents: number;
  startedOn: string;
  paidThrough: string;
};

const INVALID_DATE = "Data non valida (tra il 2000 e il 2099).";
const PAID_THROUGH_BEFORE_START = "«Pagato fino al» non può essere prima dell'inizio.";

export function newSubscriptionDraft(today: string): SubscriptionDraft {
  return { offerId: "", priceText: null, startedOn: today, paidThrough: null };
}

export function draftFromSubscription(subscription: Subscription): SubscriptionDraft {
  return {
    offerId: subscription.offerId === null ? "" : String(subscription.offerId),
    priceText: formatCentsAsInput(subscription.agreedPriceCents),
    startedOn: subscription.startedOn,
    paidThrough: subscription.paidThrough,
  };
}

/** Picking another offer brings back its list price. */
export function draftWithOffer(draft: SubscriptionDraft, offerId: string): SubscriptionDraft {
  return { ...draft, offerId, priceText: null };
}

const findOffer = (offers: Offer[], offerId: string): Offer | undefined =>
  offers.find((offer) => String(offer.id) === offerId);

export function draftPriceText(draft: SubscriptionDraft, offers: Offer[]): string {
  if (draft.priceText !== null) {
    return draft.priceText;
  }

  const offer = findOffer(offers, draft.offerId);

  return offer === undefined ? "" : formatCentsAsInput(offer.priceCents);
}

export function draftPaidThrough(draft: SubscriptionDraft): string {
  return draft.paidThrough ?? draft.startedOn;
}

/** Offers the select shows: the active ones, plus the current one even if archived. */
export function offerChoices(offers: Offer[], currentOfferId: number | null): Offer[] {
  return offers.filter((offer) => offer.archivedAt === null || offer.id === currentOfferId);
}

/** `saved` is the stored subscription when editing, null when creating. */
export function validateSubscriptionDraft(
  draft: SubscriptionDraft,
  offers: Offer[],
  saved: Subscription | null,
): { ok: true; value: ValidSubscriptionDraft } | { ok: false; errors: SubscriptionDraftErrors } {
  const offer = findOffer(offers, draft.offerId);
  const isOfferMissing = offer === undefined && saved === null;
  const price = parseEurosToCents(draftPriceText(draft, offers));
  const paidThrough = saved === null ? draftPaidThrough(draft) : saved.paidThrough;

  const offerError = isOfferMissing ? "Scegli un'offerta." : undefined;
  const priceError = price.ok ? undefined : price.error;
  const startedOnError = isValidDateKey(draft.startedOn) ? undefined : INVALID_DATE;
  const paidThroughError = paidThroughErrorFor(paidThrough, draft.startedOn, saved);
  const errors: SubscriptionDraftErrors = {
    offerId: offerError,
    price: priceError,
    startedOn: startedOnError ?? endedOnErrorFor(draft.startedOn, saved),
    paidThrough: paidThroughError,
  };
  const hasErrors = Object.values(errors).some((error) => error !== undefined);

  if (hasErrors || !price.ok) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      offerId: offer?.id ?? null,
      agreedPriceCents: price.cents,
      startedOn: draft.startedOn,
      paidThrough,
    },
  };
}

const paidThroughErrorFor = (
  paidThrough: string,
  startedOn: string,
  saved: Subscription | null,
): string | undefined => {
  const isEditable = saved === null;

  if (isEditable && !isValidDateKey(paidThrough)) {
    return INVALID_DATE;
  }

  if (paidThrough < startedOn) {
    return PAID_THROUGH_BEFORE_START;
  }

  return undefined;
};

// A closed subscription cannot start after its end: the API refuses `endedOn < startedOn`.
const endedOnErrorFor = (startedOn: string, saved: Subscription | null): string | undefined => {
  const endedOn = saved?.endedOn ?? null;

  if (endedOn !== null && endedOn < startedOn) {
    return "La chiusura non può essere prima dell'inizio.";
  }

  return undefined;
};

export function subscriptionInputForCreation(value: ValidSubscriptionDraft): SubscriptionInput {
  return {
    offerId: value.offerId ?? undefined,
    agreedPriceCents: value.agreedPriceCents,
    startedOn: value.startedOn,
    paidThrough: value.paidThrough,
  };
}

/** Only the changed fields, empty when nothing changed: `paidThrough` moves only with payments and pauses. */
export function subscriptionChanges(
  saved: Subscription,
  value: ValidSubscriptionDraft,
): SubscriptionInput {
  const isOfferChange = value.offerId !== null && value.offerId !== saved.offerId;
  // A new offer brings its own price unless the coach sends one, so it always goes along.
  const isPriceChange = isOfferChange || value.agreedPriceCents !== saved.agreedPriceCents;
  const isStartChange = value.startedOn !== saved.startedOn;

  const changes: SubscriptionInput = {
    offerId: isOfferChange ? (value.offerId ?? undefined) : undefined,
    agreedPriceCents: isPriceChange ? value.agreedPriceCents : undefined,
    startedOn: isStartChange ? value.startedOn : undefined,
  };
  const changedEntries = Object.entries(changes).filter((entry) => entry[1] !== undefined);

  return Object.fromEntries(changedEntries);
}

/**
 * The API moves the revision when the start changes or the new offer switches between
 * months and weeks; after that, earlier payments and pauses can no longer be undone.
 */
export function doesChangeAdvanceRevision(
  saved: Subscription,
  changes: SubscriptionInput,
  offers: Offer[],
): boolean {
  if (changes.startedOn !== undefined) {
    return true;
  }

  const newOffer = offers.find((offer) => offer.id === changes.offerId);

  return newOffer !== undefined && newOffer.periodUnit !== saved.periodUnit;
}

export function hasUndoableChange(
  payments: Payment[] | undefined,
  activePause: Pause | null,
): boolean {
  const canUndoPayment = (payments ?? []).some((payment) => payment.canUndo);
  const canRemovePause = activePause?.canRemove ?? false;

  return canUndoPayment || canRemovePause;
}
