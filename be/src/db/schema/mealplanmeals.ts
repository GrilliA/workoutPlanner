import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { mealPlans } from "./mealplans";
import { mealTags } from "./mealtags";
import { users } from "./users";

/** One meal of the day, shown in `position` order. Its name is the name of its tag. */
export const mealPlanMeals = pgTable(
  "meal_plan_meals",
  {
    id: serial("id").primaryKey(),
    mealPlanId: integer("meal_plan_id").notNull(),
    // Copied from the plan so the tag FK can check the tag belongs to the same coach.
    // Its own FK to users, with cascade, is what lets the coach be deleted: see the tag FK below.
    coachId: integer("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    tagId: integer("tag_id").notNull(),
    // "HH:MM", Rome time. Text, not a time column: it is only shown. The API and a CHECK
    // both hold the format.
    timeOfDay: text("time_of_day"),
    notes: text("notes"),
  },
  (table) => [
    index("meal_plan_meals_meal_plan_id_idx").on(table.mealPlanId),
    // Deleting a tag checks its meals: without an index that is a full scan.
    index("meal_plan_meals_tag_id_idx").on(table.tagId),
    // The cascade from users finds the coach's rows through this one.
    index("meal_plan_meals_coach_id_idx").on(table.coachId),
    check(
      "meal_plan_meals_time_of_day_check",
      sql`${table.timeOfDay} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
    // The pair, not the plan id alone: the copied coach_id is always the plan's.
    foreignKey({
      name: "meal_plan_meals_meal_plan_id_coach_id_fk",
      columns: [table.mealPlanId, table.coachId],
      foreignColumns: [mealPlans.id, mealPlans.coachId],
    }).onDelete("cascade"),
    // RESTRICT, spelled out: a tag that a meal uses cannot be deleted. It is not what lets the
    // coach be deleted: that is the `coach_id` FK to users with its own cascade, which removes
    // the tags and these meals together. Without it, deleting the coach would fail with
    // NO ACTION as well as with RESTRICT (checked on Postgres 16).
    foreignKey({
      name: "meal_plan_meals_tag_id_coach_id_fk",
      columns: [table.tagId, table.coachId],
      foreignColumns: [mealTags.id, mealTags.coachId],
    }).onDelete("restrict"),
  ],
);
