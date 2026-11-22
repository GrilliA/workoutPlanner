import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * The coach's list of meal names (Colazione, Pranzo, …). A meal of a plan or of a template
 * points at a tag, so renaming the tag renames the meal everywhere. A used tag is archived,
 * never deleted: plans and templates keep showing it, but it can no longer be picked.
 */
export const mealTags = pgTable(
  "meal_tags",
  {
    id: serial("id").primaryKey(),
    coachId: integer("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // One live tag per name and coach, ignoring case. Archived tags step aside, so an
    // archived "Pranzo" does not block a new one. It also makes the lazy creation of the
    // starter tags safe: two first reads at once insert them once.
    uniqueIndex("meal_tags_coach_id_name_unique")
      .on(table.coachId, sql`lower(${table.name})`)
      .where(sql`${table.archivedAt} is null`),
    // Target of the composite FKs of plan and template meals: a meal can only use a tag of
    // the coach who owns its plan or template.
    unique("meal_tags_id_coach").on(table.id, table.coachId),
    index("meal_tags_coach_id_idx").on(table.coachId),
  ],
);
