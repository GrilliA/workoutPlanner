import { index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { mealPlanMeals } from "./mealplanmeals";

/** A food in a meal. Quantity is free text ("80 g", "una tazza"): no calories or macros. */
export const mealPlanItems = pgTable(
  "meal_plan_items",
  {
    id: serial("id").primaryKey(),
    mealId: integer("meal_id")
      .notNull()
      .references(() => mealPlanMeals.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    food: text("food").notNull(),
    quantity: text("quantity"),
  },
  (table) => [index("meal_plan_items_meal_id_idx").on(table.mealId)],
);
