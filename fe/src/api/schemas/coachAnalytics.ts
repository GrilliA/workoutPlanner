import { z } from "zod";
import { coachClientSchema } from "./coach";

export const statsRangeSchema = z.enum(["4w", "12w", "52w"]);
export type StatsRange = z.infer<typeof statsRangeSchema>;

export const statsPeriodBoundsSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const weeklySeriesPointSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  sessionCount: z.number(),
  volumeKg: z.number(),
});

export const exerciseProgressionPointSchema = z.object({
  date: z.string(),
  sessionId: z.number(),
  bestE1RM: z.number().nullable(),
  bestWeightKg: z.number().nullable(),
  totalReps: z.number(),
});

export const exerciseProgressionSchema = z.object({
  exerciseId: z.number(),
  exerciseName: z.string(),
  points: z.array(exerciseProgressionPointSchema),
  prE1RM: z.number().nullable(),
  prWeightKg: z.number().nullable(),
});

export const recentSessionSummarySchema = z.object({
  sessionId: z.number(),
  workoutId: z.number(),
  workoutName: z.string(),
  completedAt: z.coerce.string(),
  durationMin: z.number(),
  volumeKg: z.number(),
});

export const coachAlertSchema = z.object({
  type: z.enum(["inactive", "program_expiring"]),
  severity: z.enum(["high", "medium"]),
  message: z.string(),
  athleteId: z.number(),
  athleteName: z.string().nullable(),
});

export const coachAnalyticsClientSummarySchema = z.object({
  athleteId: z.number(),
  athleteName: z.string().nullable(),
  lastSessionDate: z.string().nullable(),
  sessionsCompleted: z.number(),
  alertCount: z.number(),
});

export const athleteAnalyticsSchema = z.object({
  range: statsRangeSchema,
  period: statsPeriodBoundsSchema,
  previousPeriod: statsPeriodBoundsSchema,
  sessionsCompleted: z.number(),
  volumeKg: z.number(),
  previousVolumeKg: z.number(),
  volumeChangePct: z.number().nullable(),
  streakDays: z.number(),
  prCount: z.number(),
  weeklySeries: z.array(weeklySeriesPointSchema),
  exerciseProgressions: z.array(exerciseProgressionSchema),
  recentSessions: z.array(recentSessionSummarySchema),
});

export const coachAnalyticsOverviewSchema = z.object({
  range: statsRangeSchema,
  period: statsPeriodBoundsSchema,
  clientCount: z.number(),
  athletesActiveInPeriod: z.number(),
  sessionsCompletedTotal: z.number(),
  clientsToReviewCount: z.number(),
  weeklySeries: z.array(weeklySeriesPointSchema),
  alerts: z.array(coachAlertSchema),
  clients: z.array(coachAnalyticsClientSummarySchema),
});

export const coachAthleteAnalyticsSchema = z.object({
  client: coachClientSchema,
  assignment: z
    .object({
      expiresAt: z.string(),
      startsAt: z.string(),
    })
    .nullable(),
  alerts: z.array(coachAlertSchema),
  analytics: athleteAnalyticsSchema,
});

export type WeeklySeriesPoint = z.infer<typeof weeklySeriesPointSchema>;
export type ExerciseProgression = z.infer<typeof exerciseProgressionSchema>;
export type CoachAlert = z.infer<typeof coachAlertSchema>;
export type CoachAnalyticsClientSummary = z.infer<
  typeof coachAnalyticsClientSummarySchema
>;
export type AthleteAnalytics = z.infer<typeof athleteAnalyticsSchema>;
export type CoachAnalyticsOverview = z.infer<typeof coachAnalyticsOverviewSchema>;
export type CoachAthleteAnalytics = z.infer<typeof coachAthleteAnalyticsSchema>;
