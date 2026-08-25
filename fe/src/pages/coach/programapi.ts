import {
  getCoachClientProgram,
  getCoachTemplate,
  saveCoachTemplateProgram,
  updateCoachClientProgram,
  updateCoachTemplateProgram,
  type Exercise,
  type WorkoutProgramInput,
  type WorkoutSettings,
} from "@api";
import type { DraftWorkoutDay } from "@pages/workouts/new/types";
import { mapExerciseToDraft } from "@pages/workouts/new/mappers/mapDraftExercise";

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

export const toProgramInput = (
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

const mapDetailToDraft = (workout: {
  name: string;
  defaultRestSec: number;
  workoutType: string;
  frequency: string;
  days?: Array<{
    id: number;
    name: string;
    sortOrder: number;
    weekdays: number[];
    exercises?: Exercise[];
  }>;
}) => {
  const days = (workout.days ?? []).map((day) => ({
    clientId: crypto.randomUUID(),
    serverId: day.id,
    name: day.name,
    sortOrder: day.sortOrder,
    weekdays: day.weekdays as DraftWorkoutDay["weekdays"],
    exercises: (day.exercises ?? []).map(mapExerciseToDraft),
  }));

  return {
    name: workout.name,
    settings: {
      defaultRestSec: workout.defaultRestSec as WorkoutSettings["defaultRestSec"],
      workoutType: workout.workoutType as WorkoutSettings["workoutType"],
      frequency: workout.frequency as WorkoutSettings["frequency"],
    },
    days:
      days.length > 0
        ? days
        : [
            {
              clientId: crypto.randomUUID(),
              name: "Giorno 1",
              sortOrder: 0,
              weekdays: [] as DraftWorkoutDay["weekdays"],
              exercises: [],
            },
          ],
  };
};

export const loadTemplateDraft = async (templateId: number) => {
  const workout = await getCoachTemplate(templateId);
  return mapDetailToDraft(workout);
};

export const saveNewTemplate = (
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
) => saveCoachTemplateProgram(toProgramInput(name, settings, days));

export const saveUpdatedTemplate = (
  templateId: number,
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
) => updateCoachTemplateProgram(templateId, toProgramInput(name, settings, days));

export const loadClientProgramDraft = async (
  athleteId: number,
  workoutId: number,
) => {
  const workout = await getCoachClientProgram(athleteId, workoutId);
  return mapDetailToDraft(workout);
};

export const saveUpdatedClientProgram = (
  athleteId: number,
  workoutId: number,
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
) =>
  updateCoachClientProgram(
    athleteId,
    workoutId,
    toProgramInput(name, settings, days),
  );
