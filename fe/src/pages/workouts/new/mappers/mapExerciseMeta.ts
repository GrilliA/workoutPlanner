type PrescriptionLike = {
  reps: number;
  restSec?: number | null;
};

export function formatExerciseMeta(
  setPrescriptions: PrescriptionLike[],
  defaultRestSec: number,
): string {
  if (setPrescriptions.length === 0) {
    return "Nessuna serie";
  }

  const repsLabel = setPrescriptions.map((entry) => entry.reps).join("-");
  const restValues = [
    ...new Set(
      setPrescriptions.map((entry) => entry.restSec ?? defaultRestSec),
    ),
  ];
  const restLabel =
    restValues.length === 1
      ? `${restValues[0]}s recupero`
      : "recuperi vari";

  return `${setPrescriptions.length} serie · ${repsLabel} reps · ${restLabel}`;
}
