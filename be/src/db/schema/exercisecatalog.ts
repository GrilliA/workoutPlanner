import { jsonb, pgTable, text } from "drizzle-orm/pg-core";

export const exerciseCatalog = pgTable("exercise_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  force: text("force"),
  level: text("level"),
  mechanic: text("mechanic"),
  equipment: text("equipment"),
  primaryMuscles: jsonb("primary_muscles").$type<string[]>().notNull().default([]),
  secondaryMuscles: jsonb("secondary_muscles").$type<string[]>().notNull().default([]),
  category: text("category"),
  imageUrl: text("image_url"),
});
