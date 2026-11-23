import { z } from "zod";
import { apiRequest } from "./client";
import {
  clientMealPlanResponseSchema,
  mealLogsResponseSchema,
  mealPlanRequestSchema,
  mealPlanSchema,
  mealPlanTemplateRequestSchema,
  mealPlanTemplateSchema,
  mealPlanTemplatesResponseSchema,
  mealTagListsSchema,
  mealTagPatchRequestSchema,
  mealTagSchema,
  type MealPlanInput,
  type MealPlanTemplateInput,
  type MealTagPatch,
} from "./schemas/mealPlan";

type ReadOptions = { signal?: AbortSignal };

export const getCoachMealTags = ({ signal }: ReadOptions = {}) =>
  apiRequest("/coach/meal-tags", { schema: mealTagListsSchema, signal });

export const createCoachMealTag = (name: string) =>
  apiRequest("/coach/meal-tags", { method: "POST", body: { name }, schema: mealTagSchema });

export const updateCoachMealTag = (tagId: number, patch: MealTagPatch) =>
  apiRequest(`/coach/meal-tags/${tagId}`, {
    method: "PATCH",
    body: mealTagPatchRequestSchema.parse(patch),
    schema: mealTagSchema,
  });

export const getCoachMealPlanTemplates = ({ signal }: ReadOptions = {}) =>
  apiRequest("/coach/meal-plan-templates", { schema: mealPlanTemplatesResponseSchema, signal });

export const createCoachMealPlanTemplate = (input: MealPlanTemplateInput) =>
  apiRequest("/coach/meal-plan-templates", {
    method: "POST",
    body: mealPlanTemplateRequestSchema.parse(input),
    schema: mealPlanTemplateSchema,
  });

export const replaceCoachMealPlanTemplate = (templateId: number, input: MealPlanTemplateInput) =>
  apiRequest(`/coach/meal-plan-templates/${templateId}`, {
    method: "PUT",
    body: mealPlanTemplateRequestSchema.parse(input),
    schema: mealPlanTemplateSchema,
  });

export const deleteCoachMealPlanTemplate = (templateId: number) =>
  apiRequest(`/coach/meal-plan-templates/${templateId}`, {
    method: "DELETE",
    schema: z.undefined(),
  });

export const getCoachClientMealPlan = (athleteId: number, { signal }: ReadOptions = {}) =>
  apiRequest(`/coach/clients/${athleteId}/meal-plan`, {
    schema: clientMealPlanResponseSchema,
    signal,
  });

/** 201 when it creates the plan, 200 when it replaces it: same body either way. */
export const saveCoachClientMealPlan = (athleteId: number, input: MealPlanInput) =>
  apiRequest(`/coach/clients/${athleteId}/meal-plan`, {
    method: "PUT",
    body: mealPlanRequestSchema.parse(input),
    schema: mealPlanSchema,
  });

export const setCoachClientMealPlanActive = (athleteId: number, isActive: boolean) =>
  apiRequest(`/coach/clients/${athleteId}/meal-plan`, {
    method: "PATCH",
    body: { isActive },
    schema: mealPlanSchema,
  });

export const getCoachClientMealLogs = (
  athleteId: number,
  range: { from: string; to: string },
  { signal }: ReadOptions = {},
) => {
  const search = new URLSearchParams(range);

  return apiRequest(`/coach/clients/${athleteId}/meal-logs?${search.toString()}`, {
    schema: mealLogsResponseSchema,
    signal,
  });
};
