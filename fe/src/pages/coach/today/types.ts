import type { InboxItem } from "@api";

export type ActivityFeedItem = {
  sessionId: number;
  athleteId: number;
  athleteLabel: string;
  workoutName: string;
  completedAtLabel: string;
};

/** A row the coach marked as handled, and where it was: "Annulla" puts it back in place. */
export type HandledRow = {
  item: InboxItem;
  position: number;
};

/** The last "Gestito" or "Annulla" of the page: drives the undo notice, focus and live region. */
export type InboxChange = {
  kind: "handled" | "restored";
  row: HandledRow;
};
