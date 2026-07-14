import { integer, pgTable, serial, unique } from "drizzle-orm/pg-core";
import { workoutDays } from "./workoutdays";

/** 0 = Monday … 6 = Sunday (Europe/Rome calendar) */
export const workoutDayWeekdays = pgTable(
  "workout_day_weekdays",
  {
    id: serial("id").primaryKey(),
    workoutDayId: integer("workout_day_id")
      .notNull()
      .references(() => workoutDays.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
  },
  (table) => [
    unique("workout_day_weekdays_day_weekday").on(table.workoutDayId, table.weekday),
  ],
);
