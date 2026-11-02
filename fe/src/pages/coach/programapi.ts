import {
  getCoachClientProgram,
  getCoachTemplate,
  saveCoachTemplateProgram,
  updateCoachClientProgram,
  updateCoachTemplateProgram,
  type Exercise,
  type WorkoutSettings,
} from "@api";
import type { DraftWorkoutDay } from "@pages/coach/programbuilder/types";
import { mapExerciseToDraft } from "@pages/coach/programbuilder/mappers/mapDraftExercise";
import { mapDraftToProgramInput } from "@pages/coach/programbuilder/mappers/mapProgramInput";

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

export const loadTemplateDraft = async (
  templateId: number,
  { signal }: { signal?: AbortSignal } = {},
) => {
  const workout = await getCoachTemplate(templateId, { signal });
  return mapDetailToDraft(workout);
};

export const saveNewTemplate = (
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
) => saveCoachTemplateProgram(mapDraftToProgramInput(name, settings, days));

export const saveUpdatedTemplate = (
  templateId: number,
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
) => updateCoachTemplateProgram(templateId, mapDraftToProgramInput(name, settings, days));

export const loadClientProgramDraft = async (
  athleteId: number,
  workoutId: number,
  { signal }: { signal?: AbortSignal } = {},
) => {
  const workout = await getCoachClientProgram(athleteId, workoutId, { signal });
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
    mapDraftToProgramInput(name, settings, days),
  );
