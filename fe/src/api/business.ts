import { apiRequest } from "./client";
import { businessRangeSchema, coachBusinessSchema, type BusinessRange } from "./schemas/business";

export const getCoachBusiness = (
  range: BusinessRange = "6m",
  { signal }: { signal?: AbortSignal } = {},
) =>
  apiRequest(`/coach/business?range=${businessRangeSchema.parse(range)}`, {
    schema: coachBusinessSchema,
    signal,
  });
