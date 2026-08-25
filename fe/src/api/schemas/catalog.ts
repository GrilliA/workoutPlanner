import { z } from "zod";

export const catalogExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameIt: z.string().nullable(),
  force: z.string().nullable(),
  level: z.string().nullable(),
  mechanic: z.string().nullable(),
  equipment: z.string().nullable(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  category: z.string().nullable(),
  aliases: z.array(z.string()),
  imageUrl: z.string().nullable(),
  imageUrlEnd: z.string().nullable(),
});

export const catalogSearchResultSchema = z.object({
  items: z.array(catalogExerciseSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export const catalogFacetsSchema = z.object({
  muscles: z.array(z.string()),
  equipment: z.array(z.string()),
  levels: z.array(z.string()),
});

export type CatalogExercise = z.infer<typeof catalogExerciseSchema>;
export type CatalogSearchResult = z.infer<typeof catalogSearchResultSchema>;
export type CatalogFacets = z.infer<typeof catalogFacetsSchema>;

export type CatalogSearchParams = {
  q?: string;
  muscle?: string;
  equipment?: string;
  level?: string;
  limit?: number;
  offset?: number;
};
