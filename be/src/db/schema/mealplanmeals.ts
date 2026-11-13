import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { mealPlans } from "./mealplans";

/** One meal of the day, shown in `position` order. */
export const mealPlanMeals = pgTable(
  "meal_plan_meals",
  {
    id: serial("id").primaryKey(),
    mealPlanId: integer("meal_plan_id")
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    // "HH:MM", Rome time. Text, not a time column: it is only shown. The API and a CHECK
    // both hold the format.
    timeOfDay: text("time_of_day"),
    notes: text("notes"),
  },
  (table) => [
    index("meal_plan_meals_meal_plan_id_idx").on(table.mealPlanId),
    check(
      "meal_plan_meals_time_of_day_check",
      sql`${table.timeOfDay} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
  ],
);
