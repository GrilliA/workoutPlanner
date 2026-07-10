export function formatExerciseMeta(
  sets: number,
  reps: number,
  defaultRestSec: number,
): string {
  return `${sets} serie · ${reps} reps · ${defaultRestSec}s recupero`;
}
