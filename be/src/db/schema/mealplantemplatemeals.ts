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
    // Its own FK to users, with cascade, is what lets the coach be deleted: see the tag FK below.
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
    // Deleting a tag checks its meals: without an index that is a full scan.
    index("meal_plan_template_meals_tag_id_idx").on(table.tagId),
    // The cascade from users finds the coach's rows through this one.
    index("meal_plan_template_meals_coach_id_idx").on(table.coachId),
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
    // RESTRICT, spelled out: a tag that a meal uses cannot be deleted. It is not what lets the
    // coach be deleted: that is the `coach_id` FK to users with its own cascade, which removes
    // the tags and these meals together. Without it, deleting the coach would fail with
    // NO ACTION as well as with RESTRICT (checked on Postgres 16).
    foreignKey({
      name: "meal_plan_template_meals_tag_id_coach_id_fk",
      columns: [table.tagId, table.coachId],
      foreignColumns: [mealTags.id, mealTags.coachId],
    }).onDelete("restrict"),
  ],
);
