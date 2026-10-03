import { z } from "zod";
import { weekdaySchema } from "./workoutday";

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
});

export type AthleteHome = z.infer<typeof athleteHomeSchema>;
