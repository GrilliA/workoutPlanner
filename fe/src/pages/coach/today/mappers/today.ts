import type { ChurnRisk, CoachDashboardActivityItem, CoachToday, InboxItem } from "@api";
import { formatShortDate, withDatePreposition } from "@utils/romeCalendar";
import type { ActivityFeedItem, HandledRow, InboxChange } from "../types";

type InboxSeverity = InboxItem["severity"];
type InboxReasonKind = ChurnRisk["reasons"][number]["kind"] | InboxItem["alerts"][number]["kind"];

/** Colour of a reason, from its kind: the API text is only shown, never read. */
type InboxReasonTone = "error" | "accent" | "warning" | "data";

type InboxReason = {
  kind: InboxReasonKind;
  message: string;
  tone: InboxReasonTone;
};

export const INBOX_SEVERITY_LABELS: Record<InboxSeverity, string> = {
  high: "Urgente",
  medium: "Da seguire",
  low: "Da sapere",
};

export const CHURN_RISK_LABELS: Record<ChurnRisk["level"], string> = {
  high: "Rischio abbandono alto",
  medium: "Rischio abbandono medio",
};

// An unpaid subscription is the most pressing reason; activity and program are follow-ups;
// a personal record is good news.
const REASON_TONES: Record<InboxReasonKind, InboxReasonTone> = {
  subscription_expired: "error",
  subscription_expiring: "accent",
  low_frequency: "warning",
  no_recent_session: "warning",
  program_expiring: "accent",
  personal_records: "data",
};

const SUBSCRIPTION_REASON_KINDS: InboxReasonKind[] = ["subscription_expiring", "subscription_expired"];

/** The client name, or the email when the client has no name. */
export function athleteLabel(athleteName: string | null, athleteEmail: string): string {
  const name = athleteName?.trim() ?? "";

  return name === "" ? athleteEmail : name;
}

/** Risk reasons first, then the other alerts, each in the order the API sends them. */
export function inboxReasons(item: InboxItem): InboxReason[] {
  const riskReasons = item.risk?.reasons ?? [];

  return [...riskReasons, ...item.alerts].map((reason) => ({
    kind: reason.kind,
    message: reason.message,
    tone: REASON_TONES[reason.kind],
  }));
}

/** Whether the row is about the subscription: then it links to the client's subscription tab. */
export function hasSubscriptionReason(item: InboxItem): boolean {
  const riskReasons = item.risk?.reasons ?? [];

  return riskReasons.some((reason) => SUBSCRIPTION_REASON_KINDS.includes(reason.kind));
}

/** "Pagato fino al 30 ott"; null without a subscription or when it is closed, as in Clienti. */
export function formatPaidThrough(subscription: InboxItem["subscription"], today: string): string | null {
  if (subscription === null || subscription.status === "ended") {
    return null;
  }

  const paidThrough = withDatePreposition("al", subscription.paidThrough, (dateKey) =>
    formatShortDate(dateKey, today),
  );

  return `Pagato fino ${paidThrough}`;
}

/** The inbox without rows; a coach without clients sees the invite instead (`clientCount = 0`). */
export function inboxEmptyMessage(handledCount: number): string {
  if (handledCount > 0) {
    return "Hai gestito tutto: nessun altro cliente da seguire oggi.";
  }

  return "Tutto in ordine: nessun cliente da seguire oggi.";
}

export function formatHandledCount(handledCount: number): string {
  if (handledCount === 1) {
    return "1 cliente gestito: torna in lista dopo 7 giorni, o prima se peggiora.";
  }

  return `${handledCount} clienti gestiti: tornano in lista dopo 7 giorni, o prima se peggiorano.`;
}

/** The row leaves the list right after "Gestito"; the reload that follows confirms it. */
export function hideHandledItem(coachToday: CoachToday, athleteId: number): CoachToday {
  const items = coachToday.items.filter((item) => item.athleteId !== athleteId);
  const wasShown = items.length < coachToday.items.length;
  const handledCount = wasShown ? coachToday.handledCount + 1 : coachToday.handledCount;

  return { ...coachToday, items, handledCount };
}

/** "Annulla" puts the row back where it was, until the reload brings the server order. */
export function restoreHandledItem(coachToday: CoachToday, row: HandledRow): CoachToday {
  const isShown = coachToday.items.some((item) => item.athleteId === row.item.athleteId);

  if (isShown) {
    return coachToday;
  }

  const itemsBefore = coachToday.items.slice(0, row.position);
  const itemsAfter = coachToday.items.slice(row.position);
  const handledCount = Math.max(coachToday.handledCount - 1, 0);

  return { ...coachToday, items: [...itemsBefore, row.item, ...itemsAfter], handledCount };
}

/** What the live region says after "Gestito" or "Annulla"; empty before either. */
export function describeInboxChange(change: InboxChange | null): string {
  if (change === null) {
    return "";
  }

  const label = athleteLabel(change.row.item.athleteName, change.row.item.athleteEmail);

  if (change.kind === "handled") {
    return `Gestito: ${label}. Puoi annullare.`;
  }

  return `Annullato: ${label} è di nuovo in lista.`;
}

export function mapRecentActivity(items: CoachDashboardActivityItem[]): ActivityFeedItem[] {
  return items.map((item) => ({
    sessionId: item.sessionId,
    athleteId: item.athleteId,
    athleteLabel: athleteLabel(item.athleteName, item.athleteEmail),
    workoutName: item.workoutName,
    completedAtLabel: new Date(item.completedAt).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  }));
}
