import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { workouts } from "./workouts";

export const workoutDays = pgTable("workout_days", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
