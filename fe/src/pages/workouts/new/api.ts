import type { CreateWorkoutInput, WorkoutSettings } from "@api/schemas/workout";
import { createWorkout, createExercise } from "@api";
import type { DraftExercise } from "./types";

export async function saveWorkoutWithExercises(
  name: string,
  settings: WorkoutSettings,
  exercises: DraftExercise[],
) {
  const input: CreateWorkoutInput = {
    name,
    defaultRestSec: settings.defaultRestSec,
    workoutType: settings.workoutType,
    frequency: settings.frequency,
  };

  const workout = await createWorkout(input);

  await Promise.all(
    exercises.map((exercise) =>
      createExercise(workout.id, {
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
      }),
    ),
  );

  return workout;
}
