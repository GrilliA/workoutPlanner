export { API_BASE } from "./config";
export { ApiError, apiRequest } from "./client";
export {
  workoutSchema,
  workoutsSchema,
  createWorkoutRequestSchema,
  exerciseSchema,
  exercisesSchema,
  createExerciseRequestSchema,
  apiErrorSchema,
  type Workout,
  type CreateWorkoutInput,
  type Exercise,
  type CreateExerciseInput,
  type ApiErrorBody,
} from "./schemas";
export { getWorkouts, getWorkout, createWorkout } from "./workouts";
export { getExercisesByWorkout, getExercise, createExercise } from "./exercises";
