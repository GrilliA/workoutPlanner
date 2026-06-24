import { apiRequest } from "./client";
import {
  createWorkoutRequestSchema,
  workoutSchema,
  workoutsSchema,
  type CreateWorkoutInput,
  type Workout,
} from "./schemas";

export async function getWorkouts(): Promise<Workout[]> {
  return apiRequest("/workouts", { schema: workoutsSchema });
}

export async function getWorkout(id: number): Promise<Workout> {
  return apiRequest(`/workouts/${id}`, { schema: workoutSchema });
}

export async function createWorkout(
  input: CreateWorkoutInput,
): Promise<Workout> {
  return apiRequest("/workouts", {
    method: "POST",
    body: input,
    requestSchema: createWorkoutRequestSchema,
    schema: workoutSchema,
  });
}
