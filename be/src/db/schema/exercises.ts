import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { workouts } from "./workouts";

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
});
