import { z } from "zod";

export const SESSION_STATUSES = ["in_progress", "completed", "abandoned"] as const;

export const loggedSetSchema = z.object({
  id: z.number(),
  sessionId: z.number(),
  exerciseId: z.number(),
  setNumber: z.number(),
  weightKg: z.number().nullable(),
  reps: z.number(),
  rir: z.number().nullable(),
  tutSec: z.number().nullable(),
  loggedAt: z.coerce.date(),
});

export const workoutSessionSchema = z.object({
  id: z.number(),
  workoutId: z.number(),
  workoutDayId: z.number().nullable().optional(),
  userId: z.number(),
  status: z.enum(SESSION_STATUSES),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  notes: z.string().nullable(),
});

export const workoutSessionWithSetsSchema = workoutSessionSchema.extend({
  sets: z.array(loggedSetSchema),
});

export const workoutSessionSummarySchema = workoutSessionSchema.extend({
  workoutName: z.string(),
});

export const workoutSessionsSchema = z.array(workoutSessionSchema);
export const workoutSessionSummariesSchema = z.array(workoutSessionSummarySchema);

export const logSetRequestSchema = z.object({
  exerciseId: z.number().int().positive(),
  setNumber: z.number().int().positive(),
  weightKg: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().positive(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
  tutSec: z.number().int().nonnegative().nullable().optional(),
});

export const patchSessionRequestSchema = z.object({
  status: z.enum(["completed", "abandoned"]),
});

export const patchLoggedSetRequestSchema = z
  .object({
    weightKg: z.number().nonnegative().nullable().optional(),
    reps: z.number().int().positive().optional(),
    rir: z.number().int().min(0).max(10).nullable().optional(),
    tutSec: z.number().int().nonnegative().nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    { message: "At least one field is required" },
  );

export type LoggedSet = z.infer<typeof loggedSetSchema>;
export type WorkoutSession = z.infer<typeof workoutSessionSchema>;
export type WorkoutSessionWithSets = z.infer<typeof workoutSessionWithSetsSchema>;
export type WorkoutSessionSummary = z.infer<typeof workoutSessionSummarySchema>;
export type LogSetInput = z.input<typeof logSetRequestSchema>;
export type PatchSessionInput = z.input<typeof patchSessionRequestSchema>;
export type PatchLoggedSetInput = z.input<typeof patchLoggedSetRequestSchema>;
