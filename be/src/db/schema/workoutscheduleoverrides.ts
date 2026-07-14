import { date, integer, pgTable, serial, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workoutDays } from "./workoutdays";
import { workouts } from "./workouts";

/** One-off swap: on a given calendar date, use workoutDay instead of the weekly template. */
export const workoutScheduleOverrides = pgTable(
  "workout_schedule_overrides",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    scheduledDate: date("scheduled_date").notNull(),
    workoutDayId: integer("workout_day_id")
      .notNull()
      .references(() => workoutDays.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("workout_schedule_overrides_user_workout_date").on(
      table.userId,
      table.workoutId,
      table.scheduledDate,
    ),
  ],
);
