import { jsonb, pgTable, text } from "drizzle-orm/pg-core";

export const exerciseCatalog = pgTable("exercise_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameIt: text("name_it"),
  force: text("force"),
  level: text("level"),
  mechanic: text("mechanic"),
  equipment: text("equipment"),
  primaryMuscles: jsonb("primary_muscles").$type<string[]>().notNull().default([]),
  secondaryMuscles: jsonb("secondary_muscles").$type<string[]>().notNull().default([]),
  category: text("category"),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  imageUrl: text("image_url"),
  imageUrlEnd: text("image_url_end"),
});
