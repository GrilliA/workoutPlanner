import type { WorkoutProgramInput, WorkoutSettings } from "@api";
import type { DraftExercise, DraftWorkoutDay } from "../types";

const mapExerciseToProgramInput = (exercise: DraftExercise) => ({
  id: exercise.serverId,
  name: exercise.name,
  catalogId: exercise.catalogId ?? null,
  setPrescriptions: exercise.setPrescriptions.map((entry) => ({
    setNumber: entry.setNumber,
    reps: entry.reps,
    restSec: entry.restSec,
  })),
});

const mapDayToProgramInput = (day: DraftWorkoutDay) => ({
  id: day.serverId,
  name: day.name,
  sortOrder: day.sortOrder,
  weekdays: day.weekdays,
  exercises: day.exercises.map(mapExerciseToProgramInput),
});

export function mapDraftToProgramInput(
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
): WorkoutProgramInput {
  return {
    name,
    defaultRestSec: settings.defaultRestSec,
    workoutType: settings.workoutType,
    frequency: settings.frequency,
    days: days.map(mapDayToProgramInput),
  };
}
