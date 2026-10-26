import type { Offer, Payment, SubscriptionState } from "@api";
import { withDatePreposition } from "@utils/romeCalendar";

/** "tra 6 giorni", "domani", "scade oggi", "scaduto da 3 giorni". */
export function formatDaysLeft(daysLeft: number): string {
  if (daysLeft > 1) {
    return `tra ${daysLeft} giorni`;
  }

  if (daysLeft === 1) {
    return "domani";
  }

  if (daysLeft === 0) {
    return "scade oggi";
  }

  if (daysLeft === -1) {
    return "scaduto da 1 giorno";
  }

  return `scaduto da ${-daysLeft} giorni`;
}

/** The badge of the subscription card, from the state the API computes. */
export function formatSubscriptionStatus(state: SubscriptionState): string {
  if (state.status === "paused" && state.pausedUntil !== null) {
    return `In pausa fino ${withDatePreposition("al", state.pausedUntil)}`;
  }

  const labels: Record<SubscriptionState["status"], string> = {
    active: "In regola",
    expiring: "In scadenza",
    expired: "Scaduto",
    paused: "In pausa",
    ended: "Chiuso",
  };

  return labels[state.status];
}

/**
 * The offer line of the card. `offers` is undefined when the price list did not load: the
 * name is unknown, which is not the same as an offer that no longer exists.
 */
export function formatOfferName(offerId: number | null, offers: Offer[] | undefined): string {
  if (offers === undefined) {
    return "—";
  }

  const offer = offers.find((candidate) => candidate.id === offerId);

  if (offer === undefined) {
    return "Offerta non più disponibile";
  }

  return offerLabel(offer);
}

/** The offer name, marked when it is archived. */
export function offerLabel(offer: Offer): string {
  return offer.archivedAt === null ? offer.name : `${offer.name} (archiviata)`;
}

/**
 * Whole calendar months from the start to today; 0 before the first month is over.
 * A start on the 31st completes its month on the last day of a shorter one, as `addPeriods`
 * does in the API (31 January → 28 February).
 */
export function monthsSince(startedOn: string, today: string): number {
  const [startYear, startMonth, startDay] = startedOn.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const monthDifference = (todayYear - startYear) * 12 + (todayMonth - startMonth);
  const daysInTodayMonth = new Date(Date.UTC(todayYear, todayMonth, 0)).getUTCDate();
  const monthlyDay = Math.min(startDay, daysInTodayMonth);
  const isMonthIncomplete = todayDay < monthlyDay;
  const months = isMonthIncomplete ? monthDifference - 1 : monthDifference;

  return Math.max(months, 0);
}

export function formatMonthCount(months: number): string {
  if (months === 0) {
    return "meno di un mese";
  }

  return months === 1 ? "1 mese" : `${months} mesi`;
}

export function totalPaidCents(payments: Payment[]): number {
  return payments.reduce((total, payment) => total + payment.amountCents, 0);
}
