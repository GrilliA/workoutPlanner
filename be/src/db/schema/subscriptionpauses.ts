import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { clientSubscriptions } from "./clientsubscriptions";

/** Holiday or injury. Creating one moves `paidThrough` forward; cancelling moves it back. */
export const subscriptionPauses = pgTable(
  "subscription_pauses",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => clientSubscriptions.id, { onDelete: "cascade" }),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("subscription_pauses_subscription_id_idx").on(table.subscriptionId),
    // An inverted pause would move paidThrough backwards.
    check("subscription_pauses_dates_check", sql`${table.endsOn} >= ${table.startsOn}`),
  ],
);
