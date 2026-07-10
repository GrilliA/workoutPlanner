import {
  FREQUENCY_OPTIONS,
  REST_SEC_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
  type WorkoutSettings,
} from "@api/schemas/workout";

export type { WorkoutSettings };

export const DEFAULT_WORKOUT_SETTINGS: WorkoutSettings = {
  defaultRestSec: 90,
  workoutType: "Forza + Ipertrofia",
  frequency: "3× a settimana",
};

export { REST_SEC_OPTIONS, WORKOUT_TYPE_OPTIONS, FREQUENCY_OPTIONS };

export type CreateWorkoutStatus = "idle" | "saving" | "error";

export type DraftExercise = {
  clientId: string;
  name: string;
  sets: number;
  reps: number;
};

export type NewExerciseInput = {
  name: string;
  sets: number;
  reps: number;
};
