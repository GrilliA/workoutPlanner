import type { LoggedSet } from "../../api";

const MS_PER_MINUTE = 60_000;

/** Duration in minutes from start → complete (min 1 when elapsed > 0). */
export function computeDurationMin(
  startedAt: Date,
  completedAt: Date,
): number {
  const elapsedMs = completedAt.getTime() - startedAt.getTime();
  if (elapsedMs <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(elapsedMs / MS_PER_MINUTE));
}

/** Total volume: sum(weightKg * reps) for sets with positive weight. */
export function computeVolumeKg(sets: LoggedSet[]): number {
  return sets.reduce((total, set) => {
    if (set.weightKg === null || set.weightKg <= 0) {
      return total;
    }
    return total + set.weightKg * set.reps;
  }, 0);
}

export function formatVolumeLabel(volumeKg: number): string {
  if (volumeKg <= 0) {
    return "0 kg";
  }
  if (volumeKg >= 1000) {
    return `${(volumeKg / 1000).toFixed(1)}k kg`;
  }
  return `${Math.round(volumeKg)} kg`;
}

export function formatDurationLabel(durationMin: number): string {
  if (durationMin <= 0) {
    return "—";
  }
  return `${durationMin} min`;
}
