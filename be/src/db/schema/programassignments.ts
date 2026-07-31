import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workouts } from "./workouts";

export const ASSIGNMENT_STATUSES = [
  "scheduled",
  "active",
  "expired",
  "revoked",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const programAssignments = pgTable("program_assignments", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  coachId: integer("coach_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  athleteId: integer("athlete_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startsAt: date("starts_at").notNull(),
  expiresAt: date("expires_at").notNull(),
  status: text("status").notNull().default("scheduled").$type<AssignmentStatus>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
