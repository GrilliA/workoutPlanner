import type { SetSummary } from "../../api/schemas";

/** Raggruppa i set loggati per esercizio (pura, senza hook). */
export function groupSetsByExercise<TSet extends SetSummary>(
  sets: TSet[],
): Map<number, TSet[]> {
  const map = new Map<number, TSet[]>();

  for (const set of sets) {
    const list = map.get(set.exerciseId) ?? [];
    map.set(set.exerciseId, [...list, set]);
  }

  return map;
}
