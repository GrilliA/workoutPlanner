import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sqlInList } from "../sqlinlist";
import { users } from "./users";

export const PERIOD_UNITS = ["month", "week"] as const;
export type PeriodUnit = (typeof PERIOD_UNITS)[number];

/** The coach's price list. Archived instead of deleted: subscriptions keep pointing at it. */
export const coachOffers = pgTable(
  "coach_offers",
  {
    id: serial("id").primaryKey(),
    coachId: integer("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    periodUnit: text("period_unit").notNull().$type<PeriodUnit>(),
    periodCount: integer("period_count").notNull(),
    isRecurring: boolean("is_recurring").notNull().default(true),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check("coach_offers_price_cents_check", sql`${table.priceCents} >= 0`),
    check("coach_offers_period_count_check", sql`${table.periodCount} > 0`),
    check("coach_offers_period_unit_check", sqlInList(table.periodUnit, PERIOD_UNITS)),
  ],
);
