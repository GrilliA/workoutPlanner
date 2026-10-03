import type { CatalogExercise, Exercise } from "./schemas";
import { getCatalogExercise, searchCatalogExercises } from "./catalog";
import { catalogImageUrlsFromId, deriveImageUrlEnd } from "./catalogMedia";

export { catalogImageUrlsFromId, deriveImageUrlEnd } from "./catalogMedia";

export function applyCatalogIdMedia(exercise: Exercise): Exercise {
  const fromId = exercise.catalogId
    ? catalogImageUrlsFromId(exercise.catalogId)
    : null;
  const imageUrl = exercise.imageUrl ?? fromId?.imageUrl ?? null;
  const imageUrlEnd =
    exercise.imageUrlEnd ??
    fromId?.imageUrlEnd ??
    deriveImageUrlEnd(imageUrl);

  return {
    ...exercise,
    imageUrl,
    imageUrlEnd,
  };
}

export function mergeCatalogOntoExercise(
  exercise: Exercise,
  catalog: CatalogExercise,
): Exercise {
  const imageUrl = exercise.imageUrl ?? catalog.imageUrl ?? null;
  const imageUrlEnd =
    exercise.imageUrlEnd ?? catalog.imageUrlEnd ?? deriveImageUrlEnd(imageUrl);

  return {
    ...exercise,
    nameIt: exercise.nameIt ?? catalog.nameIt ?? null,
    nameEn: exercise.nameEn ?? catalog.name,
    imageUrl,
    imageUrlEnd,
  };
}

function needsCatalogName(exercise: Exercise): boolean {
  return Boolean(exercise.catalogId && (!exercise.nameIt || !exercise.nameEn));
}

function catalogMatchesName(item: CatalogExercise, name: string): boolean {
  const q = name.trim().toLowerCase();
  if (item.name.toLowerCase() === q) {
    return true;
  }
  if ((item.nameIt ?? "").trim().toLowerCase() === q) {
    return true;
  }
  return (item.aliases ?? []).some((alias) => alias.trim().toLowerCase() === q);
}

function pickCatalogForName(
  items: CatalogExercise[],
  name: string,
): CatalogExercise | undefined {
  const exact = items.find((item) => catalogMatchesName(item, name));
  if (exact) {
    return exact;
  }
  return items.length === 1 ? items[0] : undefined;
}

/** Fills photo/name fields from catalogId / catalog API when the workout payload omits them. */
export async function hydrateExercisesFromCatalog(
  exercises: Exercise[],
): Promise<Exercise[]> {
  const seeded = exercises.map(applyCatalogIdMedia);

  const ids = [
    ...new Set(
      seeded
        .filter(needsCatalogName)
        .map((exercise) => exercise.catalogId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const namesToSearch = [
    ...new Set(
      seeded
        .filter((exercise) => !exercise.catalogId && !exercise.imageUrl)
        .map((exercise) => exercise.name.trim())
        .filter((name) => name.length >= 4),
    ),
  ];

  const [idEntries, nameEntries] = await Promise.all([
    Promise.all(
      ids.map(async (id) => {
        try {
          const catalog = await getCatalogExercise(id);
          return [id, catalog] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ),
    Promise.all(
      namesToSearch.map(async (name) => {
        try {
          const result = await searchCatalogExercises({ q: name, limit: 8 });
          const match = pickCatalogForName(result.items, name);
          return match ? ([name.toLowerCase(), match] as const) : null;
        } catch {
          return null;
        }
      }),
    ),
  ]);

  const catalogById = new Map(
    idEntries.filter((entry): entry is readonly [string, CatalogExercise] => entry[1] != null),
  );
  const byName = new Map<string, CatalogExercise>();
  for (const entry of nameEntries) {
    if (entry) {
      byName.set(entry[0], entry[1]);
    }
  }

  return seeded.map((exercise) => {
    const catalog =
      (exercise.catalogId ? catalogById.get(exercise.catalogId) : undefined) ??
      byName.get(exercise.name.trim().toLowerCase());

    if (!catalog) {
      return exercise;
    }

    return mergeCatalogOntoExercise(exercise, catalog);
  });
}
