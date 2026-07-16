import { and, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { loggedSets, workoutSessions, workouts } from "../db/schema";
import {
  mapCompletedSessionsToHistoryItems,
  parseSessionHistoryLimit,
  parseSessionHistoryPage,
} from "./sessionHistory";

export async function loadSessionHistoryPage(
  userId: number,
  page: number,
  limit: number,
) {
  const completedCondition = and(
    eq(workoutSessions.userId, userId),
    eq(workoutSessions.status, "completed"),
    isNotNull(workoutSessions.completedAt),
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(workoutSessions)
    .where(completedCondition);

  const offset = (page - 1) * limit;

  const sessions = await db
    .select({
      sessionId: workoutSessions.id,
      workoutId: workoutSessions.workoutId,
      workoutName: workouts.name,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
    })
    .from(workoutSessions)
    .innerJoin(workouts, eq(workoutSessions.workoutId, workouts.id))
    .where(completedCondition)
    .orderBy(desc(workoutSessions.completedAt))
    .limit(limit)
    .offset(offset);

  const sessionIds = sessions.map((session) => session.sessionId);
  const sets =
    sessionIds.length === 0
      ? []
      : await db
          .select({
            sessionId: loggedSets.sessionId,
            weightKg: loggedSets.weightKg,
            reps: loggedSets.reps,
          })
          .from(loggedSets)
          .where(inArray(loggedSets.sessionId, sessionIds));

  const items = mapCompletedSessionsToHistoryItems(
    sessions.map((session) => ({
      ...session,
      completedAt: session.completedAt!,
    })),
    sets,
  );

  return {
    items,
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export { parseSessionHistoryLimit, parseSessionHistoryPage };
