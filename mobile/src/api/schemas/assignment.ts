import { z } from "zod";

export const activeAssignmentSchema = z.object({
  id: z.number(),
  workoutId: z.number(),
  coachId: z.number(),
  athleteId: z.number(),
  startsAt: z.string(),
  expiresAt: z.string(),
  status: z.enum(["scheduled", "active", "expired", "revoked"]),
  workoutName: z.string(),
  isActive: z.boolean(),
});

export const activeAssignmentResponseSchema = z.object({
  assignment: activeAssignmentSchema.nullable(),
});

export type ActiveAssignment = z.infer<typeof activeAssignmentSchema>;
