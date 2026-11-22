import { index, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * A named day ("Giornata standard") the coach reuses: only the ordered meals, no foods.
 * The panel applies it by filling the plan editor and saving the plan as usual.
 */
export const mealPlanTemplates = pgTable(
  "meal_plan_templates",
  {
    id: serial("id").primaryKey(),
    coachId: integer("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Target of the meal_plan_template_meals composite FK, which also checks the tag's coach.
    unique("meal_plan_templates_id_coach").on(table.id, table.coachId),
    index("meal_plan_templates_coach_id_idx").on(table.coachId),
  ],
);
