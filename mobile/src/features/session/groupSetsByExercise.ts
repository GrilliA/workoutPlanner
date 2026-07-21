import type { LoggedSet } from "../../api";

/** Raggruppa i set loggati per esercizio (pura, senza hook). */
export function groupSetsByExercise(
  sets: LoggedSet[],
): Map<number, LoggedSet[]> {
  const map = new Map<number, LoggedSet[]>();

  for (const set of sets) {
    const list = map.get(set.exerciseId) ?? [];
    map.set(set.exerciseId, [...list, set]);
  }

  return map;
}
