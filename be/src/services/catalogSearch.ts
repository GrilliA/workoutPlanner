import { deriveImageUrlEnd } from "./catalogI18n";

export type CatalogSearchInput = {
  q?: string;
  muscle?: string;
  equipment?: string;
  level?: string;
  limit?: number;
  offset?: number;
};

export type CatalogSearchParams = {
  q: string | null;
  muscle: string | null;
  equipment: string | null;
  level: string | null;
  limit: number;
  offset: number;
};

export type CatalogExercise = {
  id: string;
  name: string;
  nameIt: string | null;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string | null;
  aliases: string[];
  imageUrl: string | null;
  imageUrlEnd: string | null;
};

export type CatalogFacets = {
  muscles: string[];
  equipment: string[];
  levels: string[];
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNonNegativeInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export function parseCatalogSearchInput(input: CatalogSearchInput): CatalogSearchParams {
  const limitRaw = parseNonNegativeInt(input.limit, DEFAULT_LIMIT);
  const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT);

  return {
    q: normalizeOptionalString(input.q)?.toLowerCase() ?? null,
    muscle: normalizeOptionalString(input.muscle)?.toLowerCase() ?? null,
    equipment: normalizeOptionalString(input.equipment)?.toLowerCase() ?? null,
    level: normalizeOptionalString(input.level)?.toLowerCase() ?? null,
    limit,
    offset: parseNonNegativeInt(input.offset, 0),
  };
}

export function matchesCatalogQuery(exercise: CatalogExercise, q: string): boolean {
  if (exercise.name.toLowerCase().includes(q)) {
    return true;
  }

  if ((exercise.nameIt ?? "").toLowerCase().includes(q)) {
    return true;
  }

  return exercise.aliases.some((alias) => alias.toLowerCase().includes(q));
}

export function matchesCatalogFilters(
  exercise: CatalogExercise,
  params: CatalogSearchParams,
): boolean {
  if (params.q && !matchesCatalogQuery(exercise, params.q)) {
    return false;
  }

  if (
    params.muscle &&
    !exercise.primaryMuscles.some((muscle) => muscle.toLowerCase() === params.muscle)
  ) {
    return false;
  }

  if (params.equipment && (exercise.equipment ?? "").toLowerCase() !== params.equipment) {
    return false;
  }

  if (params.level && (exercise.level ?? "").toLowerCase() !== params.level) {
    return false;
  }

  return true;
}

export function searchCatalogExercises(
  exercises: CatalogExercise[],
  input: CatalogSearchInput,
): { items: CatalogExercise[]; total: number; limit: number; offset: number } {
  const params = parseCatalogSearchInput(input);
  const filtered = exercises.filter((exercise) => matchesCatalogFilters(exercise, params));
  const items = filtered.slice(params.offset, params.offset + params.limit);

  return {
    items,
    total: filtered.length,
    limit: params.limit,
    offset: params.offset,
  };
}

export function buildCatalogFacets(exercises: CatalogExercise[]): CatalogFacets {
  const muscles = new Set<string>();
  const equipment = new Set<string>();
  const levels = new Set<string>();

  for (const exercise of exercises) {
    for (const muscle of exercise.primaryMuscles) {
      muscles.add(muscle);
    }

    if (exercise.equipment) {
      equipment.add(exercise.equipment);
    }

    if (exercise.level) {
      levels.add(exercise.level);
    }
  }

  return {
    muscles: [...muscles].sort((a, b) => a.localeCompare(b)),
    equipment: [...equipment].sort((a, b) => a.localeCompare(b)),
    levels: [...levels].sort((a, b) => a.localeCompare(b)),
  };
}

export function toCatalogExercise(row: {
  id: string;
  name: string;
  nameIt?: string | null;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: unknown;
  secondaryMuscles: unknown;
  category: string | null;
  aliases?: unknown;
  imageUrl: string | null;
  imageUrlEnd?: string | null;
}): CatalogExercise {
  return {
    id: row.id,
    name: row.name,
    nameIt: typeof row.nameIt === "string" && row.nameIt.trim().length > 0 ? row.nameIt : null,
    force: row.force,
    level: row.level,
    mechanic: row.mechanic,
    equipment: row.equipment,
    primaryMuscles: Array.isArray(row.primaryMuscles)
      ? row.primaryMuscles.filter((value): value is string => typeof value === "string")
      : [],
    secondaryMuscles: Array.isArray(row.secondaryMuscles)
      ? row.secondaryMuscles.filter((value): value is string => typeof value === "string")
      : [],
    category: row.category,
    aliases: Array.isArray(row.aliases)
      ? row.aliases.filter((value): value is string => typeof value === "string")
      : [],
    imageUrl: row.imageUrl,
    imageUrlEnd:
      typeof row.imageUrlEnd === "string" && row.imageUrlEnd.length > 0
        ? row.imageUrlEnd
        : deriveImageUrlEnd(row.imageUrl),
  };
}
