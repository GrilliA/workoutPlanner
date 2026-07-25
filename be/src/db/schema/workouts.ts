import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  defaultRestSec: integer("default_rest_sec").notNull().default(90),
  workoutType: text("workout_type").notNull().default("Forza + Ipertrofia"),
  frequency: text("frequency").notNull().default("3× a settimana"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
