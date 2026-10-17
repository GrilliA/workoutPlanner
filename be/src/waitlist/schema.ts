import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const WAITLIST_ROLES = ["coach", "athlete"] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

/**
 * Only the fields we need to run the list and prove consent.
 * No IP, no user agent, no honeypot value.
 */
export const waitlistSignups = pgTable("waitlist_signups", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().$type<WaitlistRole>(),
  ref: text("ref"),
  consentedAt: timestamp("consented_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
