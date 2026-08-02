import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const coachInviteCodes = pgTable(
  "coach_invite_codes",
  {
    id: serial("id").primaryKey(),
    coachId: integer("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.coachId), unique().on(table.code)],
);
