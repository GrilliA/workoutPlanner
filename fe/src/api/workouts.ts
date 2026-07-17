import { apiRequest } from "./client";
import {
  createWorkoutRequestSchema,
  updateWorkoutRequestSchema,
  workoutProgramRequestSchema,
  workoutDetailSchema,
  workoutSchema,
  workoutsSchema,
  type CreateWorkoutInput,
  type UpdateWorkoutInput,
  type WorkoutProgramInput,
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

export async function updateWorkout(
  id: number,
  input: UpdateWorkoutInput,
): Promise<Workout> {
  return apiRequest(`/workouts/${id}`, {
    method: "PATCH",
    body: input,
    requestSchema: updateWorkoutRequestSchema,
    schema: workoutSchema,
  });
}

export async function saveWorkoutProgram(
  input: WorkoutProgramInput,
  workoutId?: number,
): Promise<Workout> {
  return apiRequest(
    workoutId ? `/workouts/${workoutId}/program` : "/workouts/program",
    {
      method: workoutId ? "PUT" : "POST",
      body: input,
      requestSchema: workoutProgramRequestSchema,
      schema: workoutSchema,
    },
  );
}
