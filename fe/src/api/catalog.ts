import { apiRequest } from "./client";
import {
  catalogExerciseSchema,
  catalogFacetsSchema,
  catalogSearchResultSchema,
  type CatalogExercise,
  type CatalogFacets,
  type CatalogSearchParams,
  type CatalogSearchResult,
} from "./schemas/catalog";

function toQuery(params: CatalogSearchParams): string {
  const search = new URLSearchParams();

  if (params.q) search.set("q", params.q);
  if (params.muscle) search.set("muscle", params.muscle);
  if (params.equipment) search.set("equipment", params.equipment);
  if (params.level) search.set("level", params.level);
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.offset !== undefined) search.set("offset", String(params.offset));

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function searchCatalogExercises(
  params: CatalogSearchParams = {},
): Promise<CatalogSearchResult> {
  return apiRequest(`/catalog/exercises${toQuery(params)}`, {
    schema: catalogSearchResultSchema,
  });
}

export async function getCatalogExercise(id: string): Promise<CatalogExercise> {
  return apiRequest(`/catalog/exercises/${encodeURIComponent(id)}`, {
    schema: catalogExerciseSchema,
  });
}

export async function getCatalogFacets(): Promise<CatalogFacets> {
  return apiRequest("/catalog/facets", { schema: catalogFacetsSchema });
}
