import {
  FREQUENCY_OPTIONS,
  REST_SEC_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
  type WorkoutSettings,
} from "@api/schemas/workout";
import type { Weekday } from "@api/schemas/workoutday";

export type { WorkoutSettings, Weekday };

export const DEFAULT_WORKOUT_SETTINGS: WorkoutSettings = {
  defaultRestSec: 90,
  workoutType: "Forza + Ipertrofia",
  frequency: "3× a settimana",
};

export { REST_SEC_OPTIONS, WORKOUT_TYPE_OPTIONS, FREQUENCY_OPTIONS };

export const WEEKDAY_LABELS_SHORT = [
  "Lun",
  "Mar",
  "Mer",
  "Gio",
  "Ven",
  "Sab",
  "Dom",
] as const;

export type CreateWorkoutStatus = "idle" | "loading" | "saving" | "error";

export type DraftSetPrescription = {
  setNumber: number;
  reps: number;
  restSec: number;
};

export type PickerExercise = {
  name: string;
  catalogId: string | null;
  nameIt?: string | null;
  nameEn?: string | null;
  imageUrl?: string | null;
  imageUrlEnd?: string | null;
};

export const EMPTY_PICKER_EXERCISE: PickerExercise = {
  name: "",
  catalogId: null,
  nameIt: null,
  nameEn: null,
  imageUrl: null,
  imageUrlEnd: null,
};

export function pickerExerciseFrom(source: {
  name: string;
  catalogId?: string | null;
  nameIt?: string | null;
  nameEn?: string | null;
  imageUrl?: string | null;
  imageUrlEnd?: string | null;
}): PickerExercise {
  return {
    name: source.name,
    catalogId: source.catalogId ?? null,
    nameIt: source.nameIt ?? null,
    nameEn: source.nameEn ?? null,
    imageUrl: source.imageUrl ?? null,
    imageUrlEnd: source.imageUrlEnd ?? null,
  };
}

export type DraftExercise = PickerExercise & {
  clientId: string;
  serverId?: number;
  setPrescriptions: DraftSetPrescription[];
};

export type NewExerciseInput = PickerExercise & {
  setPrescriptions: DraftSetPrescription[];
};

export type ExerciseDisplay = Pick<
  PickerExercise,
  "name" | "nameIt" | "nameEn" | "imageUrl" | "imageUrlEnd"
> & {
  setPrescriptions: Array<{ reps: number; restSec?: number | null }>;
};

export type DraftWorkoutDay = {
  clientId: string;
  serverId?: number;
  name: string;
  sortOrder: number;
  weekdays: Weekday[];
  exercises: DraftExercise[];
};

export const createDefaultSetPrescriptions = (
  count = 3,
  reps = 10,
  restSec = 90,
): DraftSetPrescription[] =>
  Array.from({ length: count }, (_, index) => ({
    setNumber: index + 1,
    reps,
    restSec,
  }));

export const createDefaultWorkoutDay = (sortOrder = 0): DraftWorkoutDay => ({
  clientId: crypto.randomUUID(),
  name: sortOrder === 0 ? "Giorno 1" : `Giorno ${sortOrder + 1}`,
  sortOrder,
  weekdays: [],
  exercises: [],
});
