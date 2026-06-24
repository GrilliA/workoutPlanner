export { API_BASE } from "./config";
export { ApiError, apiRequest } from "./client";
export {
  workoutSchema,
  workoutsSchema,
  createWorkoutRequestSchema,
  apiErrorSchema,
  type Workout,
  type CreateWorkoutInput,
  type ApiErrorBody,
} from "./schemas";
export { getWorkouts, getWorkout, createWorkout } from "./workouts";
