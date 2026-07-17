import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { workoutDays } from "./workoutdays";
import { workouts } from "./workouts";

export const SESSION_STATUSES = ["in_progress", "completed", "abandoned"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: serial("id").primaryKey(),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    workoutDayId: integer("workout_day_id").references(() => workoutDays.id, {
      onDelete: "set null",
    }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("in_progress").$type<SessionStatus>(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("workout_sessions_one_active_per_user")
      .on(table.userId)
      .where(sql`${table.status} = 'in_progress'`),
  ],
);
