import { z } from "zod";
import { weekdaySchema } from "./workoutday";

const athleteCoachingSchema = z.object({
  coachName: z.string().nullable(),
  status: z.enum(["active", "expiring", "expired", "paused", "ended"]),
  paidThrough: z.string(),
  daysLeft: z.number(),
  pausedUntil: z.string().nullable(),
});

/**
 * Uno stato nuovo del backend, un campo malformato o assente (backend prima di R6)
 * diventa null: la riga di stato sparisce, il resto della Home si carica.
 */
export const optionalAthleteCoachingSchema = athleteCoachingSchema.nullable().catch(null);

const athleteNutritionSchema = z.object({
  mealPlanId: z.number(),
  updatedAt: z.string(),
  mealCount: z.number(),
  doneToday: z.number(),
  otherToday: z.number(),
  nextMeal: z
    .object({
      id: z.number(),
      name: z.string(),
      timeOfDay: z.string().nullable(),
    })
    .nullable(),
});

/**
 * Piano pasti attivo (AL4). Assente (backend prima di AL4) o malformato diventa null:
 * lo switch Allenamento / Alimentazione resta nascosto, il resto della Home si carica.
 */
const optionalAthleteNutritionSchema = athleteNutritionSchema.nullable().catch(null);

export const athleteHomeSchema = z.object({
  noProgramReason: z
    .enum(["no-coach", "coach-pending", "coach-program-inactive"])
    .nullable(),
  programs: z.array(
    z.object({
      workoutId: z.number(),
      name: z.string(),
      source: z.enum(["coach", "self"]),
      expiresAt: z.string().nullable(),
      days: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          weekdays: z.array(weekdaySchema),
          exerciseCount: z.number(),
        }),
      ),
    }),
  ),
  today: z
    .object({
      date: z.string(),
      workoutId: z.number(),
      workoutDayId: z.number(),
      workoutDayName: z.string(),
    })
    .nullable(),
  week: z.array(
    z.object({
      date: z.string(),
      weekday: weekdaySchema,
      workoutDayId: z.number().nullable(),
      workoutDayName: z.string().nullable(),
    }),
  ),
  nextWorkout: z
    .object({
      date: z.string(),
      workoutDayName: z.string(),
    })
    .nullable(),
  sessionsLast7Days: z.number(),
  lastSession: z
    .object({
      sessionId: z.number(),
      workoutDayName: z.string().nullable(),
      completedAt: z.coerce.date(),
      volumeKg: z.number(),
    })
    .nullable(),
  hasUnseenAssignment: z.boolean(),
  coaching: optionalAthleteCoachingSchema,
  nutrition: optionalAthleteNutritionSchema,
});

export type AthleteHome = z.infer<typeof athleteHomeSchema>;
export type AthleteCoaching = z.infer<typeof athleteCoachingSchema>;
export type AthleteCoachingStatus = AthleteCoaching["status"];
export type AthleteNutrition = z.infer<typeof athleteNutritionSchema>;
