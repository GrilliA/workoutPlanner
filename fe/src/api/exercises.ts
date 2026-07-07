import { apiRequest } from "./client";
import {
  createExerciseRequestSchema,
  exerciseSchema,
  exercisesSchema,
  type CreateExerciseInput,
  type Exercise,
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
