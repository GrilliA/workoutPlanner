import type { WorkoutProgramInput, WorkoutSettings } from "@api";
import type { DraftExercise, DraftSetPrescription, DraftWorkoutDay } from "../types";

// The editor keeps a unit picked even with no load; the API wants both or neither.
const mapSetPrescriptionToProgramInput = (entry: DraftSetPrescription) => {
  const hasLoad = entry.loadValue !== null;

  return {
    setNumber: entry.setNumber,
    reps: entry.reps,
    repsMax: entry.repsMax,
    loadValue: entry.loadValue,
    loadUnit: hasLoad ? entry.loadUnit : null,
    rir: entry.rir,
    restSec: entry.restSec,
  };
};

const mapExerciseToProgramInput = (exercise: DraftExercise) => {
  const notes = exercise.notes.trim();

  return {
    id: exercise.serverId,
    name: exercise.name,
    catalogId: exercise.catalogId ?? null,
    notes: notes === "" ? null : notes,
    setPrescriptions: exercise.setPrescriptions.map(mapSetPrescriptionToProgramInput),
  };
};

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
