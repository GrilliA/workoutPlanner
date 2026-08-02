import { z } from "zod";
import { workoutProgramRequestSchema } from "./workout";

export const coachClientSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  createdAt: z.coerce.string(),
  linkedAt: z.coerce.string(),
});

export const coachClientsSchema = z.array(coachClientSchema);

export const coachAssignmentSchema = z.object({
  id: z.number(),
  workoutId: z.number(),
  coachId: z.number(),
  athleteId: z.number(),
  startsAt: z.string(),
  expiresAt: z.string(),
  status: z.enum(["scheduled", "active", "expired", "revoked"]),
  createdAt: z.coerce.string().optional(),
  workoutName: z.string().optional(),
  athleteName: z.string().nullable().optional(),
  athleteEmail: z.string().optional(),
});

export const coachAssignmentsSchema = z.array(coachAssignmentSchema);

export const coachClientDetailSchema = z.object({
  client: coachClientSchema,
  assignments: coachAssignmentsSchema,
  recentSessions: z
    .array(
      z.object({
        sessionId: z.number(),
        workoutId: z.number(),
        workoutName: z.string(),
        completedAt: z.coerce.string(),
        durationMin: z.number(),
        volumeKg: z.number(),
      }),
    )
    .optional()
    .default([]),
});

export const coachInviteCodeSchema = z.object({
  code: z.string(),
  updatedAt: z.coerce.string(),
});

export const coachDashboardExpirationItemSchema = z.object({
  id: z.number(),
  athleteId: z.number(),
  athleteName: z.string().nullable(),
  athleteEmail: z.string(),
  workoutId: z.number(),
  workoutName: z.string(),
  expiresAt: z.string(),
  daysLeft: z.number(),
});

export const coachDashboardExpiredItemSchema = z.object({
  id: z.number(),
  athleteId: z.number(),
  athleteName: z.string().nullable(),
  athleteEmail: z.string(),
  workoutId: z.number(),
  workoutName: z.string(),
  expiresAt: z.string(),
});

export const coachDashboardSchema = z.object({
  clientCount: z.number(),
  templateCount: z.number(),
  activeAssignments: z.number(),
  scheduledAssignments: z.number(),
  expiringIn7Days: z.number(),
  expiringIn14Days: z.number(),
  expiringIn30Days: z.number(),
  expiredAssignments: z.number(),
  expirationsByMonth: z.array(
    z.object({
      month: z.string(),
      count: z.number(),
    }),
  ),
  upcomingExpirations: z.array(coachDashboardExpirationItemSchema),
  expiredAssignmentsList: z.array(coachDashboardExpiredItemSchema),
});

export const coachTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  defaultRestSec: z.number(),
  workoutType: z.string(),
  frequency: z.string(),
  isActive: z.boolean(),
  kind: z.string().optional(),
  createdAt: z.coerce.string(),
  exerciseCount: z.number(),
});

export const coachTemplatesSchema = z.array(coachTemplateSchema);

export const createClientRequestSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(8),
  name: z.string().trim().optional(),
});

export const resetPasswordRequestSchema = z.object({
  password: z.string().min(8),
});

export const updateAssignmentDatesRequestSchema = z.object({
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const okResponseSchema = z.object({
  ok: z.literal(true),
});

export const createAssignmentRequestSchema = z.object({
  athleteId: z.number(),
  startsAt: z.string(),
  expiresAt: z.string(),
  templateId: z.number().optional(),
  name: z.string().optional(),
  program: workoutProgramRequestSchema.optional(),
});

export type CoachClient = z.infer<typeof coachClientSchema>;
export type CoachAssignment = z.infer<typeof coachAssignmentSchema>;
export type CoachClientDetail = z.infer<typeof coachClientDetailSchema>;
export type CoachInviteCode = z.infer<typeof coachInviteCodeSchema>;
export type CoachDashboard = z.infer<typeof coachDashboardSchema>;
export type CoachDashboardExpirationItem = z.infer<
  typeof coachDashboardExpirationItemSchema
>;
export type CoachDashboardExpiredItem = z.infer<
  typeof coachDashboardExpiredItemSchema
>;
export type CoachTemplate = z.infer<typeof coachTemplateSchema>;
export type CreateClientInput = z.input<typeof createClientRequestSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordRequestSchema>;
export type UpdateAssignmentDatesInput = z.input<typeof updateAssignmentDatesRequestSchema>;
export type CreateAssignmentInput = z.input<typeof createAssignmentRequestSchema>;
