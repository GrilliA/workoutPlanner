import { sql } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";
import { sqlInList } from "../sqlinlist";
import { clientSubscriptions } from "./clientsubscriptions";

export const PAYMENT_METHODS = ["cash", "bank_transfer", "satispay", "paypal", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** A payment the coach recorded by hand. We never move money. */
export const subscriptionPayments = pgTable(
  "subscription_payments",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    paidOn: date("paid_on").notNull(),
    method: text("method").notNull().$type<PaymentMethod>(),
    periods: integer("periods").notNull(),
    coversFrom: date("covers_from").notNull(),
    coversTo: date("covers_to").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // The generated name is 65 characters; Postgres would cut it at 63 and drift from the snapshot.
    foreignKey({
      name: "subscription_payments_subscription_id_fk",
      columns: [table.subscriptionId],
      foreignColumns: [clientSubscriptions.id],
    }).onDelete("cascade"),
    index("subscription_payments_subscription_id_idx").on(table.subscriptionId),
    check("subscription_payments_amount_cents_check", sql`${table.amountCents} >= 0`),
    check("subscription_payments_periods_check", sql`${table.periods} > 0`),
    check("subscription_payments_method_check", sqlInList(table.method, PAYMENT_METHODS)),
    check("subscription_payments_covers_check", sql`${table.coversTo} > ${table.coversFrom}`),
  ],
);
