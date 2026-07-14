import { z } from "zod";

export const statsPeriodSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const recentSessionSummarySchema = z.object({
  sessionId: z.number(),
  workoutId: z.number(),
  workoutName: z.string(),
  completedAt: z.coerce.date(),
  durationMin: z.number(),
  volumeKg: z.number(),
});

export const userStatsSchema = z.object({
  period: statsPeriodSchema,
  volumeKg: z.number(),
  workoutsPerWeek: z.number(),
  streakDays: z.number(),
  recordVolumeKg: z.number(),
  recentSessions: z.array(recentSessionSummarySchema),
});

export type StatsPeriod = z.infer<typeof statsPeriodSchema>;
export type RecentSessionSummary = z.infer<typeof recentSessionSummarySchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
