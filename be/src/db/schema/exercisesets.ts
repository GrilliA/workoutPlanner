import { integer, pgTable, real, serial, text, unique } from "drizzle-orm/pg-core";
import { exercises } from "./exercises";

export const LOAD_UNITS = ["kg", "percent_1rm"] as const;
export type LoadUnit = (typeof LOAD_UNITS)[number];

export const exerciseSets = pgTable(
  "exercise_sets",
  {
    id: serial("id").primaryKey(),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps").notNull(),
    repsMax: integer("reps_max"),
    loadValue: real("load_value"),
    loadUnit: text("load_unit").$type<LoadUnit>(),
    rir: integer("rir"),
    restSec: integer("rest_sec"),
  },
  (table) => [
    unique("exercise_sets_exercise_set_number").on(table.exerciseId, table.setNumber),
  ],
);
