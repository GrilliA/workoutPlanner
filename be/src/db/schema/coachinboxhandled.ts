import {
  check,
  foreignKey,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sqlInList } from "../sqlinlist";
import { coachAthletes } from "./coachathletes";

export const INBOX_SEVERITIES = ["high", "medium", "low"] as const;
export type InboxSeverity = (typeof INBOX_SEVERITIES)[number];

/**
 * A client the coach marked as handled in the Today inbox. The severity at that moment
 * is stored so a row that gets worse comes back before the hiding window ends.
 */
export const coachInboxHandled = pgTable(
  "coach_inbox_handled",
  {
    id: serial("id").primaryKey(),
    coachId: integer("coach_id").notNull(),
    athleteId: integer("athlete_id").notNull(),
    handledAt: timestamp("handled_at").defaultNow().notNull(),
    severityAtHandle: text("severity_at_handle").notNull().$type<InboxSeverity>(),
  },
  (table) => [
    unique("coach_inbox_handled_coach_athlete").on(table.coachId, table.athleteId),
    // Points at the link, not at users: unlinking or deleting a user clears the row,
    // a relinked client starts clean, and an unlinked pair cannot be written.
    // The generated name is 77 characters; Postgres would cut it at 63 and drift from the snapshot.
    foreignKey({
      name: "coach_inbox_handled_coach_id_athlete_id_fk",
      columns: [table.coachId, table.athleteId],
      foreignColumns: [coachAthletes.coachId, coachAthletes.athleteId],
    }).onDelete("cascade"),
    check("coach_inbox_handled_severity_at_handle_check", sqlInList(table.severityAtHandle, INBOX_SEVERITIES)),
  ],
);
