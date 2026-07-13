import { integer, pgTable, real, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { exercises } from "./exercises";
import { workoutSessions } from "./workoutsessions";

export const loggedSets = pgTable(
  "logged_sets",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    weightKg: real("weight_kg"),
    reps: integer("reps").notNull(),
    rir: integer("rir"),
    tutSec: integer("tut_sec"),
    loggedAt: timestamp("logged_at").defaultNow().notNull(),
  },
  (table) => [
    unique("logged_sets_session_exercise_set").on(
      table.sessionId,
      table.exerciseId,
      table.setNumber,
    ),
  ],
);
