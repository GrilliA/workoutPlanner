import { apiRequest } from "./client";
import {
  createExerciseRequestSchema,
  createWorkoutDayRequestSchema,
  exerciseSchema,
  exercisesSchema,
  scheduleOverrideRequestSchema,
  scheduleOverrideResponseSchema,
  setWeekdaysRequestSchema,
  updateWorkoutDayRequestSchema,
  workoutDaySchema,
  workoutDaysSchema,
  workoutScheduleSchema,
  type CreateExerciseInput,
  type CreateWorkoutDayInput,
  type Exercise,
  type ScheduleOverrideInput,
  type SetWeekdaysInput,
  type UpdateWorkoutDayInput,
  type WorkoutDay,
  type WorkoutSchedule,
} from "./schemas";

export async function getWorkoutDays(workoutId: number): Promise<WorkoutDay[]> {
  return apiRequest(`/workouts/${workoutId}/days`, { schema: workoutDaysSchema });
}

export async function getWorkoutDay(workoutId: number, dayId: number): Promise<WorkoutDay> {
  return apiRequest(`/workouts/${workoutId}/days/${dayId}`, { schema: workoutDaySchema });
}

export async function createWorkoutDay(
  workoutId: number,
  input: CreateWorkoutDayInput,
): Promise<WorkoutDay> {
  return apiRequest(`/workouts/${workoutId}/days`, {
    method: "POST",
    body: input,
    requestSchema: createWorkoutDayRequestSchema,
    schema: workoutDaySchema,
  });
}

export async function updateWorkoutDay(
  workoutId: number,
  dayId: number,
  input: UpdateWorkoutDayInput,
): Promise<WorkoutDay> {
  return apiRequest(`/workouts/${workoutId}/days/${dayId}`, {
    method: "PATCH",
    body: input,
    requestSchema: updateWorkoutDayRequestSchema,
    schema: workoutDaySchema,
  });
}

export async function deleteWorkoutDay(workoutId: number, dayId: number): Promise<void> {
  await apiRequest(`/workouts/${workoutId}/days/${dayId}`, {
    method: "DELETE",
  });
}

export async function setWorkoutDayWeekdays(
  workoutId: number,
  dayId: number,
  input: SetWeekdaysInput,
): Promise<WorkoutDay> {
  return apiRequest(`/workouts/${workoutId}/days/${dayId}/weekdays`, {
    method: "PUT",
    body: input,
    requestSchema: setWeekdaysRequestSchema,
    schema: workoutDaySchema,
  });
}

export async function getWorkoutDayExercises(
  workoutId: number,
  dayId: number,
): Promise<Exercise[]> {
  return apiRequest(`/workouts/${workoutId}/days/${dayId}/exercises`, {
    schema: exercisesSchema,
  });
}

export async function createWorkoutDayExercise(
  workoutId: number,
  dayId: number,
  input: CreateExerciseInput,
): Promise<Exercise> {
  return apiRequest(`/workouts/${workoutId}/days/${dayId}/exercises`, {
    method: "POST",
    body: input,
    requestSchema: createExerciseRequestSchema,
    schema: exerciseSchema,
  });
}

export async function getWorkoutScheduleToday(
  workoutId: number,
  date?: string,
): Promise<WorkoutSchedule> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";

  return apiRequest(`/workouts/${workoutId}/schedule/today${query}`, {
    schema: workoutScheduleSchema,
  });
}

export async function setScheduleOverride(
  workoutId: number,
  input: ScheduleOverrideInput,
) {
  return apiRequest(`/workouts/${workoutId}/schedule/overrides`, {
    method: "POST",
    body: input,
    requestSchema: scheduleOverrideRequestSchema,
    schema: scheduleOverrideResponseSchema,
  });
}

export async function deleteScheduleOverride(
  workoutId: number,
  scheduledDate: string,
): Promise<void> {
  await apiRequest(`/workouts/${workoutId}/schedule/overrides/${scheduledDate}`, {
    method: "DELETE",
  });
}
