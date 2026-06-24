import { z } from "zod";

export const workoutSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.coerce.date(),
});

export const workoutsSchema = z.array(workoutSchema);

export const createWorkoutRequestSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
});

export type Workout = z.infer<typeof workoutSchema>;
export type CreateWorkoutInput = z.input<typeof createWorkoutRequestSchema>;
