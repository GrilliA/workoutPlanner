import { apiRequest } from "./client";
import {
  createWorkoutRequestSchema,
  workoutDetailSchema,
  workoutSchema,
  workoutsSchema,
  type CreateWorkoutInput,
  type Workout,
  type WorkoutDetail,
} from "./schemas";

export async function getWorkouts(): Promise<Workout[]> {
  return apiRequest("/workouts", { schema: workoutsSchema });
}

export async function getWorkout(id: number): Promise<WorkoutDetail> {
  return apiRequest(`/workouts/${id}`, { schema: workoutDetailSchema });
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
