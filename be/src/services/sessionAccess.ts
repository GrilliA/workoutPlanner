import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../db";
import { exercises, loggedSets, workoutSessions } from "../db/schema";

export async function findSessionForUser(
  sessionId: number,
  userId: number,
): Promise<typeof workoutSessions.$inferSelect | null> {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));

  return session ?? null;
}

export async function findActiveSessionForUser(
  userId: number,
): Promise<typeof workoutSessions.$inferSelect | null> {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "in_progress")),
    );

  return session ?? null;
}

export async function findExerciseInWorkout(
  exerciseId: number,
  workoutId: number,
  workoutDayId?: number | null,
): Promise<typeof exercises.$inferSelect | null> {
  const conditions = [eq(exercises.id, exerciseId), eq(exercises.workoutId, workoutId)];

  if (workoutDayId != null) {
    conditions.push(
      or(eq(exercises.workoutDayId, workoutDayId), isNull(exercises.workoutDayId))!,
    );
  }

  const [exercise] = await db
    .select()
    .from(exercises)
    .where(and(...conditions));

  return exercise ?? null;
}

export async function findLoggedSetForSession(
  setId: number,
  sessionId: number,
): Promise<typeof loggedSets.$inferSelect | null> {
  const [set] = await db
    .select()
    .from(loggedSets)
    .where(and(eq(loggedSets.id, setId), eq(loggedSets.sessionId, sessionId)));

  return set ?? null;
}
