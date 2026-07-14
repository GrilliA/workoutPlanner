import { integer, pgTable, serial, unique } from "drizzle-orm/pg-core";
import { exercises } from "./exercises";

export const exerciseSets = pgTable(
  "exercise_sets",
  {
    id: serial("id").primaryKey(),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps").notNull(),
    restSec: integer("rest_sec"),
  },
  (table) => [
    unique("exercise_sets_exercise_set_number").on(table.exerciseId, table.setNumber),
  ],
);
