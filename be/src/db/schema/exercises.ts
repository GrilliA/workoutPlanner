import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { workoutDays } from "./workoutdays";
import { workouts } from "./workouts";

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  workoutDayId: integer("workout_day_id").references(() => workoutDays.id, {
    onDelete: "cascade",
  }),
});
