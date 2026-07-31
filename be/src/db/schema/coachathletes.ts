import { integer, pgTable, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const coachAthletes = pgTable(
  "coach_athletes",
  {
    id: serial("id").primaryKey(),
    coachId: integer("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    athleteId: integer("athlete_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.coachId, table.athleteId)],
);
