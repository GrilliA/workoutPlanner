import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { mealPlanTemplates } from "./mealplantemplates";
import { mealTags } from "./mealtags";
import { users } from "./users";

/** One meal of a template, shown in `position` order: a tag and an optional time. */
export const mealPlanTemplateMeals = pgTable(
  "meal_plan_template_meals",
  {
    id: serial("id").primaryKey(),
    templateId: integer("template_id").notNull(),
    // Copied from the template so the tag FK can check the tag belongs to the same coach.
    // Its own cascade from users is needed: see the tag FK below.
    coachId: integer("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    tagId: integer("tag_id").notNull(),
    // Same format and CHECK as meal_plan_meals.time_of_day.
    timeOfDay: text("time_of_day"),
  },
  (table) => [
    index("meal_plan_template_meals_template_id_idx").on(table.templateId),
    // Deleting a tag (only through the coach's cascade) checks its meals: without an index that is a full scan.
    index("meal_plan_template_meals_tag_id_idx").on(table.tagId),
    check(
      "meal_plan_template_meals_time_of_day_check",
      sql`${table.timeOfDay} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
    // The pair, not the template id alone: the copied coach_id is always the template's.
    foreignKey({
      name: "meal_plan_template_meals_template_id_coach_id_fk",
      columns: [table.templateId, table.coachId],
      foreignColumns: [mealPlanTemplates.id, mealPlanTemplates.coachId],
    }).onDelete("cascade"),
    // Blocks deleting a used tag (default NO ACTION). Deleting the coach still works: their
    // tags and these meals are both cascaded straight from users, and Postgres runs those
    // cascades before the NO ACTION check the tag delete queues. RESTRICT checks at once and
    // would block it; so would reaching these meals only through the plan or template.
    foreignKey({
      name: "meal_plan_template_meals_tag_id_coach_id_fk",
      columns: [table.tagId, table.coachId],
      foreignColumns: [mealTags.id, mealTags.coachId],
    }),
  ],
);
