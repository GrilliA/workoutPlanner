import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
