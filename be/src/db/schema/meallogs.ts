import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sqlInList } from "../sqlinlist";
import { mealPlanMeals } from "./mealplanmeals";
import { mealPlans } from "./mealplans";

export const MEAL_LOG_STATUSES = ["done", "other"] as const;
export type MealLogStatus = (typeof MEAL_LOG_STATUSES)[number];

/**
 * What the athlete did for one meal on one Rome day: followed it, or ate something else.
 * The meal name is copied, so editing or removing a meal from the plan keeps the history.
 */
export const mealLogs = pgTable(
  "meal_logs",
  {
    id: serial("id").primaryKey(),
    athleteId: integer("athlete_id").notNull(),
    mealPlanId: integer("meal_plan_id").notNull(),
    mealId: integer("meal_id").references(() => mealPlanMeals.id, { onDelete: "set null" }),
    mealName: text("meal_name").notNull(),
    date: date("date").notNull(),
    status: text("status").notNull().$type<MealLogStatus>(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // One log per meal and day, so writing the same log twice updates the row.
    // A removed meal leaves its logs with meal_id NULL: NULLs are distinct here on purpose,
    // so those orphan logs never clash with each other. Do not add NULLS NOT DISTINCT.
    // Leads with (athlete_id, date): the athlete's day and range reads use that prefix.
    unique("meal_logs_athlete_date_meal").on(table.athleteId, table.date, table.mealId),
    // The coach reads a plan's logs by day range.
    index("meal_logs_meal_plan_id_date_idx").on(table.mealPlanId, table.date),
    // Removing a meal sets meal_id to NULL on its logs: without an index that is a full scan.
    index("meal_logs_meal_id_idx").on(table.mealId),
    // One FK on the pair instead of two single ones: the log's athlete must be the plan's
    // athlete. Deleting the plan (unlinking, or deleting the user) clears its logs.
    foreignKey({
      name: "meal_logs_meal_plan_id_athlete_id_fk",
      columns: [table.mealPlanId, table.athleteId],
      foreignColumns: [mealPlans.id, mealPlans.athleteId],
    }).onDelete("cascade"),
    check("meal_logs_status_check", sqlInList(table.status, MEAL_LOG_STATUSES)),
  ],
);
