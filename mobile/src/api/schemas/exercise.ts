import { z } from "zod";

export const setPrescriptionSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive(),
  restSec: z.number().int().nonnegative().nullable(),
});

export const exerciseSchema = z.object({
  id: z.number(),
  name: z.string(),
  sets: z.number().nullable(),
  reps: z.number().nullable(),
  workoutId: z.number(),
  workoutDayId: z.number().nullable().optional(),
  catalogId: z.string().nullable().optional(),
  nameIt: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageUrlEnd: z.string().nullable().optional(),
  setPrescriptions: z.array(setPrescriptionSchema).default([]),
});

export const exercisesSchema = z.array(exerciseSchema);

export const createExerciseRequestSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  setPrescriptions: z.array(setPrescriptionSchema).min(1, "At least one set is required"),
  catalogId: z.string().trim().min(1).nullable().optional(),
});

export const updateExerciseRequestSchema = createExerciseRequestSchema;

export type SetPrescription = z.infer<typeof setPrescriptionSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type CreateExerciseInput = z.input<typeof createExerciseRequestSchema>;
export type UpdateExerciseInput = z.input<typeof updateExerciseRequestSchema>;
