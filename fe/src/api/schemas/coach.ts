import { z } from "zod";
import { subscriptionStateSchema } from "./subscription";
import { workoutProgramRequestSchema } from "./workout";

export const coachClientSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  createdAt: z.coerce.string(),
  linkedAt: z.coerce.string(),
});

/** Subscription state of a client in the list and in Oggi; null = the coach never set one. */
const clientSubscriptionSummarySchema = subscriptionStateSchema.extend({ paidThrough: z.string() });

/**
 * Churn risk of a client (contract: docs/contracts/pt-oggi.md, R5): the same object in
 * `GET /coach/clients` and `GET /coach/today`. `message` is Italian text to show as is; colours
 * and icons come from `kind`, never from the text.
 */
const churnRiskSchema = z.object({
  level: z.enum(["high", "medium"]),
  reasons: z.array(
    z.object({
      kind: z.enum(["subscription_expiring", "subscription_expired", "low_frequency", "no_recent_session"]),
      message: z.string(),
    }),
  ),
});

/**
 * A row of `GET /coach/clients` (contract: docs/contracts/pt-clienti.md, R4). The detail and
 * analytics keep `coachClientSchema`: only the list carries subscription and activity.
 */
const coachClientListItemSchema = coachClientSchema.extend({
  subscription: clientSubscriptionSummarySchema.nullable(),
  /** Rome calendar day of the last completed session, null if none. */
  lastSessionOn: z.string().nullable(),
  /** Window of 14 Rome days, today included. `expectedSessions` is null without an active program. */
  last14Days: z.object({
    completedSessions: z.number(),
    expectedSessions: z.number().nullable(),
  }),
  /** null = no risk, also when the subscription is paused (R5). */
  risk: churnRiskSchema.nullable(),
});

export const coachClientsSchema = z.array(coachClientListItemSchema);

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

export const coachDashboardActivityItemSchema = z.object({
  sessionId: z.number(),
  athleteId: z.number(),
  athleteName: z.string().nullable(),
  athleteEmail: z.string(),
  workoutId: z.number(),
  workoutName: z.string(),
  completedAt: z.coerce.string(),
});

/** One row per client of `GET /coach/today`: at least one of `risk` and `alerts`. */
const inboxItemSchema = z.object({
  athleteId: z.number(),
  athleteName: z.string().nullable(),
  athleteEmail: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  risk: churnRiskSchema.nullable(),
  alerts: z.array(
    z.object({
      kind: z.enum(["program_expiring", "personal_records"]),
      message: z.string(),
    }),
  ),
  subscription: clientSubscriptionSummarySchema.nullable(),
});

/**
 * `GET /coach/today`. `items` come sorted by urgency; rows hidden by "Gestito" only count in
 * `handledCount`. `clientCount` counts linked clients, also those without a row.
 */
export const coachTodaySchema = z.object({
  clientCount: z.number(),
  handledCount: z.number(),
  items: z.array(inboxItemSchema),
  recentActivity: z.array(coachDashboardActivityItemSchema),
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
export type CoachClientListItem = z.infer<typeof coachClientListItemSchema>;
export type CoachAssignment = z.infer<typeof coachAssignmentSchema>;
export type CoachClientDetail = z.infer<typeof coachClientDetailSchema>;
export type CoachInviteCode = z.infer<typeof coachInviteCodeSchema>;
export type CoachDashboardActivityItem = z.infer<
  typeof coachDashboardActivityItemSchema
>;
export type ChurnRisk = z.infer<typeof churnRiskSchema>;
export type InboxItem = z.infer<typeof inboxItemSchema>;
export type CoachToday = z.infer<typeof coachTodaySchema>;
export type CoachTemplate = z.infer<typeof coachTemplateSchema>;
export type CreateClientInput = z.input<typeof createClientRequestSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordRequestSchema>;
export type UpdateAssignmentDatesInput = z.input<typeof updateAssignmentDatesRequestSchema>;
export type CreateAssignmentInput = z.input<typeof createAssignmentRequestSchema>;
