import { z } from "zod";

export const weekdaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const workoutDaySchema = z.object({
  id: z.number(),
  workoutId: z.number(),
  name: z.string(),
  sortOrder: z.number(),
  weekdays: z.array(weekdaySchema),
  exerciseCount: z.number(),
});

export const workoutDaysSchema = z.array(workoutDaySchema);

export const createWorkoutDayRequestSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  sortOrder: z.number().int().nonnegative().optional(),
  weekdays: z.array(weekdaySchema).optional(),
});

export const updateWorkoutDayRequestSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const setWeekdaysRequestSchema = z.object({
  weekdays: z.array(weekdaySchema),
});

export const scheduleDayRefSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const workoutScheduleSchema = z.object({
  date: z.string(),
  weekday: weekdaySchema,
  workoutDay: scheduleDayRefSchema.nullable(),
  source: z.enum(["override", "schedule", "default"]).nullable(),
});

export const scheduleOverrideRequestSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workoutDayId: z.number().int().positive(),
});

export const scheduleOverrideResponseSchema = z.object({
  scheduledDate: z.string(),
  workoutDayId: z.number(),
  workoutDayName: z.string(),
});

export const startSessionRequestSchema = z.object({
  workoutDayId: z.number().int().positive().optional(),
});

export type Weekday = z.infer<typeof weekdaySchema>;
export type WorkoutDay = z.infer<typeof workoutDaySchema>;
export type CreateWorkoutDayInput = z.input<typeof createWorkoutDayRequestSchema>;
export type UpdateWorkoutDayInput = z.input<typeof updateWorkoutDayRequestSchema>;
export type SetWeekdaysInput = z.input<typeof setWeekdaysRequestSchema>;
export type WorkoutSchedule = z.infer<typeof workoutScheduleSchema>;
export type ScheduleOverrideInput = z.input<typeof scheduleOverrideRequestSchema>;
export type StartSessionInput = z.input<typeof startSessionRequestSchema>;
