import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sqlInList } from "../sqlinlist";
import { coachOffers, PERIOD_UNITS, type PeriodUnit } from "./coachoffers";
import { users } from "./users";

/**
 * What a client pays their coach. Price and period are copied from the offer
 * when the subscription starts, so editing the price list never changes a client.
 * `paidThrough` is stored, not rebuilt from payments: pauses move it too, and
 * replaying payments and pauses on every read is what we want to avoid.
 */
export const clientSubscriptions = pgTable(
  "client_subscriptions",
  {
    id: serial("id").primaryKey(),
    coachId: integer("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    athleteId: integer("athlete_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    offerId: integer("offer_id").references(() => coachOffers.id, { onDelete: "set null" }),
    agreedPriceCents: integer("agreed_price_cents").notNull(),
    periodUnit: text("period_unit").notNull().$type<PeriodUnit>(),
    periodCount: integer("period_count").notNull(),
    isRecurring: boolean("is_recurring").notNull(),
    startedOn: date("started_on").notNull(),
    paidThrough: date("paid_through").notNull(),
    // Day of the month a monthly period ends on. Without it, 31 Jan → 28 Feb would stay on the 28th.
    billingDay: integer("billing_day").notNull(),
    endedOn: date("ended_on"),
    // Counts the changes that move paidThrough or billingDay. Only the row that wrote
    // the current value can be undone; timestamps cannot tell which write came last.
    revision: integer("revision").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("client_subscriptions_coach_athlete").on(table.coachId, table.athleteId),
    // The unique pair leads with coach_id; the athlete home looks up by athlete alone.
    index("client_subscriptions_athlete_id_idx").on(table.athleteId),
    check("client_subscriptions_agreed_price_cents_check", sql`${table.agreedPriceCents} >= 0`),
    check("client_subscriptions_period_count_check", sql`${table.periodCount} > 0`),
    check("client_subscriptions_period_unit_check", sqlInList(table.periodUnit, PERIOD_UNITS)),
    check("client_subscriptions_paid_through_check", sql`${table.paidThrough} >= ${table.startedOn}`),
    check("client_subscriptions_billing_day_check", sql`${table.billingDay} BETWEEN 1 AND 31`),
    check("client_subscriptions_ended_on_check", sql`${table.endedOn} >= ${table.startedOn}`),
  ],
);
