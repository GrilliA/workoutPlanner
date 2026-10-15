import { z } from "zod";
import { recentSessionSummarySchema } from "./stats";

export const SESSION_STATUSES = ["in_progress", "completed", "abandoned"] as const;

export const loggedSetSchema = z.object({
  id: z.number(),
  sessionId: z.number(),
  exerciseId: z.number(),
  setNumber: z.number(),
  weightKg: z.coerce.number().nullable(),
  reps: z.coerce.number(),
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

/** Which set of a session: the same exercise and set number is the same set. */
export const setPositionSchema = z.object({
  exerciseId: z.number(),
  setNumber: z.number(),
});

export const logSetRequestSchema = z.object({
  exerciseId: z.number().int().positive(),
  setNumber: z.number().int().positive(),
  weightKg: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().positive(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
  tutSec: z.number().int().nonnegative().nullable().optional(),
  /** ISO time on the phone; the server keeps it inside the session. */
  loggedAt: z.string().datetime().optional(),
});

export const patchSessionRequestSchema = z
  .object({
    status: z.enum(["completed", "abandoned"]),
    /** Replaces every set of the session, all at once with the close. */
    sets: z.array(logSetRequestSchema).optional(),
    /** ISO time on the phone when the athlete closed the session. */
    completedAt: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "abandoned" && value.sets !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sets are not allowed when abandoning a session",
        path: ["sets"],
      });
    }
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
export type SetPosition = z.infer<typeof setPositionSchema>;
export type PatchLoggedSetInput = z.input<typeof patchLoggedSetRequestSchema>;

export const sessionHistoryResponseSchema = z.object({
  items: z.array(recentSessionSummarySchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export type SessionHistoryResponse = z.infer<typeof sessionHistoryResponseSchema>;
