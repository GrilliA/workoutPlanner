import { LOAD_UNIT_LABELS, type ExerciseDisplay } from "../types";

type PrescriptionLike = ExerciseDisplay["setPrescriptions"][number];

const formatRepsLabel = (entry: PrescriptionLike): string =>
  entry.repsMax ? `${entry.reps}–${entry.repsMax}` : String(entry.reps);

const formatLoadLabel = (entry: PrescriptionLike): string | null => {
  if (entry.loadValue == null || entry.loadUnit == null) {
    return null;
  }

  const value = entry.loadValue.toLocaleString("it-IT");

  return entry.loadUnit === "kg" ? `${value} kg` : `${value}${LOAD_UNIT_LABELS[entry.loadUnit]}`;
};

const formatRirLabel = (entry: PrescriptionLike): string | null =>
  entry.rir == null ? null : `RIR ${entry.rir}`;

const uniqueLabels = (labels: Array<string | null>): string[] => [
  ...new Set(labels.filter((label): label is string => label !== null)),
];

// One shared value reads as-is; different values per set collapse into a short "vari" label.
const summarizeLabels = (labels: string[], variedLabel: string): string | null => {
  if (labels.length === 0) {
    return null;
  }

  return labels.length === 1 ? labels[0] : variedLabel;
};

export function formatExerciseMeta(
  setPrescriptions: PrescriptionLike[],
  defaultRestSec: number,
): string {
  if (setPrescriptions.length === 0) {
    return "Nessuna serie";
  }

  const repsLabels = uniqueLabels(setPrescriptions.map(formatRepsLabel));
  const repsLabel =
    repsLabels.length === 1 ? repsLabels[0] : setPrescriptions.map(formatRepsLabel).join(" / ");
  const loadLabel = summarizeLabels(
    uniqueLabels(setPrescriptions.map(formatLoadLabel)),
    "carichi vari",
  );
  const rirLabel = summarizeLabels(uniqueLabels(setPrescriptions.map(formatRirLabel)), "RIR vari");
  const restLabels = uniqueLabels(
    setPrescriptions.map((entry) => `${entry.restSec ?? defaultRestSec}s recupero`),
  );
  const restLabel = summarizeLabels(restLabels, "recuperi vari");

  return [`${setPrescriptions.length} serie`, `${repsLabel} reps`, loadLabel, rirLabel, restLabel]
    .filter((part): part is string => part !== null)
    .join(" · ");
}
