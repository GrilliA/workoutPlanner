import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const WORKOUT_KINDS = ["template", "program"] as const;
export type WorkoutKind = (typeof WORKOUT_KINDS)[number];

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  sourceTemplateId: integer("source_template_id"),
  kind: text("kind").notNull().default("program").$type<WorkoutKind>(),
  name: text("name").notNull(),
  defaultRestSec: integer("default_rest_sec").notNull().default(90),
  workoutType: text("workout_type").notNull().default("Forza + Ipertrofia"),
  frequency: text("frequency").notNull().default("3× a settimana"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
