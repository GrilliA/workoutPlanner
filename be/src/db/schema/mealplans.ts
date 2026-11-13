import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { coachAthletes } from "./coachathletes";

/**
 * The meal plan a coach prepares for a client: one plan per pair, the same every day.
 * Turning it off keeps it, so the coach can turn it back on without rewriting it.
 */
export const mealPlans = pgTable(
  "meal_plans",
  {
    id: serial("id").primaryKey(),
    coachId: integer("coach_id").notNull(),
    athleteId: integer("athlete_id").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("meal_plans_coach_athlete").on(table.coachId, table.athleteId),
    // The unique pair leads with coach_id; the athlete home looks up by athlete alone.
    index("meal_plans_athlete_id_idx").on(table.athleteId),
    // Points at the link, not at users: unlinking clears the plan and, through it, the logs.
    // The generated name is longer than 63 characters; Postgres would cut it and drift from the snapshot.
    foreignKey({
      name: "meal_plans_coach_id_athlete_id_fk",
      columns: [table.coachId, table.athleteId],
      foreignColumns: [coachAthletes.coachId, coachAthletes.athleteId],
    }).onDelete("cascade"),
  ],
);
