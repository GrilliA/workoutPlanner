import { z } from "zod";

export const LOAD_UNITS = ["kg", "percent_1rm"] as const;
export const loadUnitSchema = z.enum(LOAD_UNITS);

export const EXERCISE_NOTES_MAX_LENGTH = 500;
export const exerciseNotesSchema = z.string().max(EXERCISE_NOTES_MAX_LENGTH).nullable();

// The new fields are optional so a response from a server without them still parses.
export const setPrescriptionSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive(),
  repsMax: z.number().int().positive().nullable().optional(),
  loadValue: z.number().positive().nullable().optional(),
  loadUnit: loadUnitSchema.nullable().optional(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
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
  notes: exerciseNotesSchema.optional(),
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
  notes: exerciseNotesSchema.optional(),
});

export const updateExerciseRequestSchema = createExerciseRequestSchema;

export type LoadUnit = z.infer<typeof loadUnitSchema>;
export type SetPrescription = z.infer<typeof setPrescriptionSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type CreateExerciseInput = z.input<typeof createExerciseRequestSchema>;
export type UpdateExerciseInput = z.input<typeof updateExerciseRequestSchema>;
