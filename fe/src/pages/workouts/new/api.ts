import {
  getWorkout,
  getWorkoutDayExercises,
  getWorkoutDays,
  saveWorkoutProgram,
} from "@api";
import type { WorkoutSettings, WorkoutProgramInput } from "@api";
import type { DraftWorkoutDay } from "./types";
import { mapExerciseToDraft } from "./mappers/mapDraftExercise";

const toExercisePayload = (exercise: DraftWorkoutDay["exercises"][number]) => ({
  id: exercise.serverId,
  name: exercise.name,
  catalogId: exercise.catalogId ?? null,
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

export async function updateWorkoutWithDays(
  workoutId: number,
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
) {
  return saveWorkoutProgram(toProgramInput(name, settings, days), workoutId);
}
