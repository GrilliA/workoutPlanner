import { apiRequest } from "./client";
import {
  createExerciseRequestSchema,
  exerciseSchema,
  exercisesSchema,
  updateExerciseRequestSchema,
  type CreateExerciseInput,
  type Exercise,
  type UpdateExerciseInput,
} from "./schemas";

export async function getExercisesByWorkout(workoutId: number): Promise<Exercise[]> {
  return apiRequest(`/workouts/${workoutId}/exercises`, { schema: exercisesSchema });
}

export async function getExercise(id: number): Promise<Exercise> {
  return apiRequest(`/exercises/${id}`, { schema: exerciseSchema });
}

export async function createExercise(
  workoutId: number,
  input: CreateExerciseInput,
): Promise<Exercise> {
  return apiRequest(`/workouts/${workoutId}/exercises`, {
    method: "POST",
    body: input,
    requestSchema: createExerciseRequestSchema,
    schema: exerciseSchema,
  });
}

export async function updateExercise(
  id: number,
  input: UpdateExerciseInput,
): Promise<Exercise> {
  return apiRequest(`/exercises/${id}`, {
    method: "PATCH",
    body: input,
    requestSchema: updateExerciseRequestSchema,
    schema: exerciseSchema,
  });
}

export async function deleteExercise(id: number): Promise<void> {
  await apiRequest(`/exercises/${id}`, { method: "DELETE" });
}
