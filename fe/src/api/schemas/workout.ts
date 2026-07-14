import { z } from "zod";

export const REST_SEC_OPTIONS = [60, 90, 120, 150] as const;

export const WORKOUT_TYPE_OPTIONS = [
  "Forza + Ipertrofia",
  "Forza",
  "Ipertrofia",
  "Resistenza",
] as const;

export const FREQUENCY_OPTIONS = [
  "2× a settimana",
  "3× a settimana",
  "4× a settimana",
  "5× a settimana",
] as const;

export const workoutSettingsSchema = z.object({
  defaultRestSec: z.union([
    z.literal(60),
    z.literal(90),
    z.literal(120),
    z.literal(150),
  ]),
  workoutType: z.enum(WORKOUT_TYPE_OPTIONS),
  frequency: z.enum(FREQUENCY_OPTIONS),
});

export const workoutSchema = z.object({
  id: z.number(),
  name: z.string(),
  defaultRestSec: z.number(),
  workoutType: z.string(),
  frequency: z.string(),
  createdAt: z.coerce.date(),
  exerciseCount: z.number(),
});

export const workoutDetailSchema = workoutSchema.extend({
  days: z
    .array(
      z.object({
        id: z.number(),
        workoutId: z.number(),
        name: z.string(),
        sortOrder: z.number(),
        weekdays: z.array(z.number().int().min(0).max(6)),
        exerciseCount: z.number(),
      }),
    )
    .optional(),
});

export const workoutsSchema = z.array(workoutSchema);

export const createWorkoutRequestSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  defaultRestSec: workoutSettingsSchema.shape.defaultRestSec.optional(),
  workoutType: workoutSettingsSchema.shape.workoutType.optional(),
  frequency: workoutSettingsSchema.shape.frequency.optional(),
});

export type WorkoutSettings = z.infer<typeof workoutSettingsSchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type WorkoutDetail = z.infer<typeof workoutDetailSchema>;
export type CreateWorkoutInput = z.input<typeof createWorkoutRequestSchema>;
