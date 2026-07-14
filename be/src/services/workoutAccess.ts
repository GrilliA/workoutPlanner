import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { exercises, workouts } from "../db/schema";

export async function findWorkoutForUser(
  workoutId: number,
  userId: number,
): Promise<{ id: number } | null> {
  const [workout] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));

  return workout ?? null;
}

export async function findExerciseForUser(
  exerciseId: number,
  userId: number,
): Promise<typeof exercises.$inferSelect | null> {
  const [row] = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      sets: exercises.sets,
      reps: exercises.reps,
      workoutId: exercises.workoutId,
      workoutDayId: exercises.workoutDayId,
    })
    .from(exercises)
    .innerJoin(workouts, eq(exercises.workoutId, workouts.id))
    .where(and(eq(exercises.id, exerciseId), eq(workouts.userId, userId)));

  return row ?? null;
}
