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
    // Its own cascade from users is needed: see the tag FK below.
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
    // Deleting a tag (only through the coach's cascade) checks its meals: without an index that is a full scan.
    index("meal_plan_meals_tag_id_idx").on(table.tagId),
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
    // Blocks deleting a used tag (default NO ACTION). Deleting the coach still works: their
    // tags and these meals are both cascaded straight from users, and Postgres runs those
    // cascades before the NO ACTION check the tag delete queues. RESTRICT checks at once and
    // would block it; so would reaching these meals only through the plan or template.
    foreignKey({
      name: "meal_plan_meals_tag_id_coach_id_fk",
      columns: [table.tagId, table.coachId],
      foreignColumns: [mealTags.id, mealTags.coachId],
    }),
  ],
);
