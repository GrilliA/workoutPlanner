import { z } from "zod";

// Contract: docs/contracts/al-piano-pasti.md (AL2, AL3). Times of day are "HH:MM" (Rome),
// dates are calendar days `YYYY-MM-DD`, timestamps are ISO strings.

export const mealTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  position: z.number(),
  archivedAt: z.string().nullable(),
});

/** A tag as the list gives it: with how many active plans and templates use it (AL3). */
const listedMealTagSchema = mealTagSchema.extend({
  planCount: z.number(),
  templateCount: z.number(),
});

export const mealTagListsSchema = z.object({
  mealTags: z.array(listedMealTagSchema),
  archivedMealTags: z.array(listedMealTagSchema),
});

const mealItemSchema = z.object({
  id: z.number(),
  food: z.string(),
  quantity: z.string().nullable(),
  position: z.number(),
});

const mealSchema = z.object({
  id: z.number(),
  tagId: z.number(),
  name: z.string(),
  timeOfDay: z.string().nullable(),
  notes: z.string().nullable(),
  position: z.number(),
  items: z.array(mealItemSchema),
});

export const mealPlanSchema = z.object({
  id: z.number(),
  athleteId: z.number(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  meals: z.array(mealSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `GET .../meal-plan` answers 200 also without a plan, with `mealPlan: null`. */
export const clientMealPlanResponseSchema = z.object({
  mealPlan: mealPlanSchema.nullable(),
});

export const mealPlanTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  meals: z.array(
    z.object({
      tagId: z.number(),
      name: z.string(),
      timeOfDay: z.string().nullable(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const mealPlanTemplatesResponseSchema = z.object({
  mealPlanTemplates: z.array(mealPlanTemplateSchema),
});

const mealDayAdherenceSchema = z.object({
  date: z.string(),
  mealCount: z.number(),
  doneCount: z.number(),
  otherCount: z.number(),
  removedCount: z.number(),
});

export const mealLogsResponseSchema = z.object({
  days: z.array(mealDayAdherenceSchema),
});

/** The whole plan as it must be after the save: a meal or item without `id` is new. */
export const mealPlanRequestSchema = z.object({
  notes: z.string().nullable(),
  meals: z.array(
    z.object({
      id: z.number().int().optional(),
      tagId: z.number().int(),
      timeOfDay: z.string().nullable(),
      notes: z.string().nullable(),
      items: z.array(
        z.object({
          id: z.number().int().optional(),
          food: z.string(),
          quantity: z.string().nullable(),
        }),
      ),
    }),
  ),
});

export const mealPlanTemplateRequestSchema = z.object({
  name: z.string(),
  meals: z.array(
    z.object({
      tagId: z.number().int(),
      timeOfDay: z.string().nullable(),
    }),
  ),
});

export const mealTagPatchRequestSchema = z.object({
  name: z.string().optional(),
  position: z.number().int().optional(),
  archived: z.literal(true).optional(),
});

export type ListedMealTag = z.infer<typeof listedMealTagSchema>;
export type MealTagLists = z.infer<typeof mealTagListsSchema>;
export type MealPlan = z.infer<typeof mealPlanSchema>;
export type MealPlanTemplate = z.infer<typeof mealPlanTemplateSchema>;
export type MealDayAdherence = z.infer<typeof mealDayAdherenceSchema>;
export type MealPlanInput = z.input<typeof mealPlanRequestSchema>;
export type MealPlanTemplateInput = z.input<typeof mealPlanTemplateRequestSchema>;
export type MealTagPatch = z.input<typeof mealTagPatchRequestSchema>;
