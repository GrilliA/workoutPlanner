import type { CoachClientListItem } from "@api";
import { formatSubscriptionStatus } from "../detail/subscription/mappers/subscriptionSummary";

export type ClientFilter = "all" | "expiring" | "expired" | "paused" | "withoutSubscription";

/** The filters in display order. */
export const CLIENT_FILTERS: ClientFilter[] = ["all", "expiring", "expired", "paused", "withoutSubscription"];

/** Label and `?stato=` value of each filter, from the contract (Tutti has none). */
export const CLIENT_FILTER_OPTIONS: Record<ClientFilter, { label: string; searchValue: string | null }> = {
  all: { label: "Tutti", searchValue: null },
  expiring: { label: "In scadenza", searchValue: "in-scadenza" },
  expired: { label: "Scaduti", searchValue: "scaduti" },
  paused: { label: "In pausa", searchValue: "in-pausa" },
  withoutSubscription: { label: "Senza abbonamento", searchValue: "senza-abbonamento" },
};

/** The filter of a `?stato=` value; a missing or unknown value shows every client. */
export function clientFilterFromSearch(searchValue: string | null): ClientFilter {
  const filter = CLIENT_FILTERS.find((candidate) => CLIENT_FILTER_OPTIONS[candidate].searchValue === searchValue);

  return filter ?? "all";
}

/** The query string of a filter: Tutti leaves `?stato=` out. */
export function searchForClientFilter(filter: ClientFilter): Record<string, string> {
  const { searchValue } = CLIENT_FILTER_OPTIONS[filter];

  if (searchValue === null) {
    return {};
  }

  return { stato: searchValue };
}

// An ended subscription of a client still linked has to be set up again, like a missing one:
// both belong to the onboarding filter.
const MATCHES_FILTER: Record<ClientFilter, (client: CoachClientListItem) => boolean> = {
  all: () => true,
  expiring: (client) => client.subscription?.status === "expiring",
  expired: (client) => client.subscription?.status === "expired",
  paused: (client) => client.subscription?.status === "paused",
  withoutSubscription: (client) =>
    client.subscription === null || client.subscription.status === "ended",
};

export function filterClients(clients: CoachClientListItem[], filter: ClientFilter): CoachClientListItem[] {
  return clients.filter(MATCHES_FILTER[filter]);
}

/**
 * The status pill of a row: the subscription card label, or "Senza abbonamento". The table
 * shows the end of a pause on its own line, so the pill keeps only "In pausa".
 */
export function formatClientStatus(subscription: CoachClientListItem["subscription"]): string {
  if (subscription === null) {
    return "Senza abbonamento";
  }

  return formatSubscriptionStatus({ ...subscription, pausedUntil: null });
}

/** "3 su 6"; only the count when there is no active program to compare with. */
export function formatTrainingFrequency(last14Days: CoachClientListItem["last14Days"]): string {
  if (last14Days.expectedSessions === null) {
    return String(last14Days.completedSessions);
  }

  return `${last14Days.completedSessions} su ${last14Days.expectedSessions}`;
}
