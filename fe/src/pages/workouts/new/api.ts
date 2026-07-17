import {
  getWorkout,
  getWorkoutDayExercises,
  getWorkoutDays,
  saveWorkoutProgram,
} from "@api";
import type { Exercise, WorkoutSettings, WorkoutProgramInput } from "@api";
import type { DraftWorkoutDay } from "./types";

const toExercisePayload = (exercise: DraftWorkoutDay["exercises"][number]) => ({
  id: exercise.serverId,
  name: exercise.name,
  setPrescriptions: exercise.setPrescriptions.map((entry) => ({
    setNumber: entry.setNumber,
    reps: entry.reps,
    restSec: entry.restSec,
  })),
});

const toProgramInput = (
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
): WorkoutProgramInput => ({
  name,
  defaultRestSec: settings.defaultRestSec,
  workoutType: settings.workoutType,
  frequency: settings.frequency,
  days: days.map((day) => ({
    id: day.serverId,
    name: day.name,
    sortOrder: day.sortOrder,
    weekdays: day.weekdays,
    exercises: day.exercises.map(toExercisePayload),
  })),
});

export async function saveWorkoutWithDays(
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
) {
  return saveWorkoutProgram(toProgramInput(name, settings, days));
}

export async function loadWorkoutDraft(workoutId: number): Promise<{
  name: string;
  settings: WorkoutSettings;
  days: DraftWorkoutDay[];
}> {
  const workout = await getWorkout(workoutId);
  const days = workout.days ?? (await getWorkoutDays(workoutId));

  const daysWithExercises = await Promise.all(
    days.map(async (day) => {
      const exercises = await getWorkoutDayExercises(workoutId, day.id);

      return {
        clientId: crypto.randomUUID(),
        serverId: day.id,
        name: day.name,
        sortOrder: day.sortOrder,
        weekdays: day.weekdays,
        exercises: exercises.map(mapExerciseToDraft),
      };
    }),
  );

  return {
    name: workout.name,
    settings: {
      defaultRestSec: workout.defaultRestSec as WorkoutSettings["defaultRestSec"],
      workoutType: workout.workoutType as WorkoutSettings["workoutType"],
      frequency: workout.frequency as WorkoutSettings["frequency"],
    },
    days: daysWithExercises,
  };
}

const mapExerciseToDraft = (exercise: Exercise): DraftWorkoutDay["exercises"][number] => ({
  clientId: crypto.randomUUID(),
  serverId: exercise.id,
  name: exercise.name,
  setPrescriptions:
    exercise.setPrescriptions.length > 0
      ? exercise.setPrescriptions.map((entry) => ({
          setNumber: entry.setNumber,
          reps: entry.reps,
          restSec: entry.restSec ?? 90,
        }))
      : [{ setNumber: 1, reps: exercise.reps ?? 10, restSec: 90 }],
});

export async function updateWorkoutWithDays(
  workoutId: number,
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
) {
  return saveWorkoutProgram(toProgramInput(name, settings, days), workoutId);
}
