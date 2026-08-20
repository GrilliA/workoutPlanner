import { z } from "zod";

export const statsRangeSchema = z.enum(["4w", "12w", "52w"]);
export type StatsRange = z.infer<typeof statsRangeSchema>;

export const statsPeriodSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const statsPeriodBoundsSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const recentSessionSummarySchema = z.object({
  sessionId: z.number(),
  workoutId: z.number(),
  workoutName: z.string(),
  completedAt: z.coerce.date(),
  durationMin: z.number(),
  volumeKg: z.number(),
});

export const dailyStatPointSchema = z.object({
  date: z.string(),
  weekdayLabel: z.string(),
  volumeKg: z.number(),
  workoutCount: z.number(),
});

/** Legacy home dashboard payload (GET /stats without range). */
export const userStatsSchema = z.object({
  period: statsPeriodSchema,
  volumeKg: z.number(),
  workoutsPerWeek: z.number(),
  streakDays: z.number(),
  recordVolumeKg: z.number(),
  totalSessions: z.number(),
  averageSessionVolumeKg: z.number(),
  dailyBreakdown: z.array(dailyStatPointSchema),
  recentSessions: z.array(recentSessionSummarySchema),
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

/** Full analytics payload (GET /stats?range=4w|12w|52w). */
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

export type StatsPeriod = z.infer<typeof statsPeriodSchema>;
export type StatsPeriodBounds = z.infer<typeof statsPeriodBoundsSchema>;
export type RecentSessionSummary = z.infer<typeof recentSessionSummarySchema>;
export type DailyStatPoint = z.infer<typeof dailyStatPointSchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
export type WeeklySeriesPoint = z.infer<typeof weeklySeriesPointSchema>;
export type ExerciseProgressionPoint = z.infer<typeof exerciseProgressionPointSchema>;
export type ExerciseProgression = z.infer<typeof exerciseProgressionSchema>;
export type AthleteAnalytics = z.infer<typeof athleteAnalyticsSchema>;
