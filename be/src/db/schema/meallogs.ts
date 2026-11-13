import {
  check,
  date,
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
import { users } from "./users";

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
    athleteId: integer("athlete_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mealPlanId: integer("meal_plan_id")
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
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
    unique("meal_logs_athlete_meal_date").on(table.athleteId, table.mealId, table.date),
    check("meal_logs_status_check", sqlInList(table.status, MEAL_LOG_STATUSES)),
  ],
);
