import {
  createWorkout,
  createWorkoutDay,
  createWorkoutDayExercise,
  deleteExercise,
  deleteWorkoutDay,
  getWorkout,
  getWorkoutDayExercises,
  getWorkoutDays,
  setWorkoutDayWeekdays,
  updateExercise,
  updateWorkout,
  updateWorkoutDay,
} from "@api";
import type { Exercise, WorkoutSettings } from "@api";
import type { CreateWorkoutInput } from "@api/schemas/workout";
import type { DraftWorkoutDay } from "./types";

const toExercisePayload = (exercise: DraftWorkoutDay["exercises"][number]) => ({
  name: exercise.name,
  setPrescriptions: exercise.setPrescriptions.map((entry) => ({
    setNumber: entry.setNumber,
    reps: entry.reps,
    restSec: entry.restSec,
  })),
});

export async function saveWorkoutWithDays(
  name: string,
  settings: WorkoutSettings,
  days: DraftWorkoutDay[],
) {
  const input: CreateWorkoutInput = {
    name,
    defaultRestSec: settings.defaultRestSec,
    workoutType: settings.workoutType,
    frequency: settings.frequency,
  };

  const workout = await createWorkout(input);
  const existingDays = await getWorkoutDays(workout.id);
  const [defaultDay] = existingDays;

  await Promise.all(
    days.map(async (draft, index) => {
      const dayId =
        index === 0 && defaultDay
          ? defaultDay.id
          : (
              await createWorkoutDay(workout.id, {
                name: draft.name,
                sortOrder: draft.sortOrder,
                weekdays: draft.weekdays,
              })
            ).id;

      if (index === 0 && defaultDay) {
        await updateWorkoutDay(workout.id, dayId, {
          name: draft.name,
          sortOrder: draft.sortOrder,
        });
        await setWorkoutDayWeekdays(workout.id, dayId, {
          weekdays: draft.weekdays,
        });
      }

      await Promise.all(
        draft.exercises.map((exercise) =>
          createWorkoutDayExercise(workout.id, dayId, toExercisePayload(exercise)),
        ),
      );
    }),
  );

  return workout;
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
  await updateWorkout(workoutId, {
    name,
    defaultRestSec: settings.defaultRestSec,
    workoutType: settings.workoutType,
    frequency: settings.frequency,
  });

  const serverDays = await getWorkoutDays(workoutId);
  const draftServerDayIds = new Set(
    days.flatMap((day) => (day.serverId ? [day.serverId] : [])),
  );

  await Promise.all(
    serverDays
      .filter((day) => !draftServerDayIds.has(day.id) && serverDays.length > 1)
      .map((day) => deleteWorkoutDay(workoutId, day.id)),
  );

  const resolvedDays = await Promise.all(
    days.map(async (draft) => {
      if (draft.serverId) {
        await updateWorkoutDay(workoutId, draft.serverId, {
          name: draft.name,
          sortOrder: draft.sortOrder,
        });
        await setWorkoutDayWeekdays(workoutId, draft.serverId, {
          weekdays: draft.weekdays,
        });

        return { draft, dayId: draft.serverId };
      }

      const created = await createWorkoutDay(workoutId, {
        name: draft.name,
        sortOrder: draft.sortOrder,
        weekdays: draft.weekdays,
      });

      return { draft, dayId: created.id };
    }),
  );

  await Promise.all(
    resolvedDays.map(async ({ draft, dayId }) => {
      const serverExercises = await getWorkoutDayExercises(workoutId, dayId);
      const draftServerExerciseIds = new Set(
        draft.exercises.flatMap((exercise) =>
          exercise.serverId ? [exercise.serverId] : [],
        ),
      );

      await Promise.all(
        serverExercises
          .filter((exercise) => !draftServerExerciseIds.has(exercise.id))
          .map((exercise) => deleteExercise(exercise.id)),
      );

      await Promise.all(
        draft.exercises.map((exercise) => {
          const payload = toExercisePayload(exercise);

          return exercise.serverId
            ? updateExercise(exercise.serverId, payload)
            : createWorkoutDayExercise(workoutId, dayId, payload);
        }),
      );
    }),
  );
}
