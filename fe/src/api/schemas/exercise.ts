import { z } from "zod";

export const exerciseSchema = z.object({
  id: z.number(),
  name: z.string(),
  sets: z.number().nullable(),
  reps: z.number().nullable(),
  workoutId: z.number(),
});

export const exercisesSchema = z.array(exerciseSchema);

export const createExerciseRequestSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  sets: z.number().int().optional(),
  reps: z.number().int().optional(),
});

export type Exercise = z.infer<typeof exerciseSchema>;
export type CreateExerciseInput = z.input<typeof createExerciseRequestSchema>;
