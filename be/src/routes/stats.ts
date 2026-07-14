import { Router } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { loggedSets, workoutSessions, workouts } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { buildUserStats, groupLoggedSetsBySession, parseRecentLimit } from "../services/stats";
import { getAuthUser } from "../types/auth";

export const statsRouter = Router();

statsRouter.use(requireAuth);

statsRouter.get("/", async (req, res) => {
  const user = getAuthUser(req);
  const recentLimit = parseRecentLimit(req.query.recentLimit);

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
    .where(
      and(eq(workoutSessions.userId, user.id), eq(workoutSessions.status, "completed")),
    )
    .orderBy(desc(workoutSessions.completedAt));

  const completedSessions = sessions.flatMap((session) => {
    if (!session.completedAt) {
      return [];
    }

    return [
      {
        sessionId: session.sessionId,
        workoutId: session.workoutId,
        workoutName: session.workoutName,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
    ];
  });

  const sessionIds = completedSessions.map((session) => session.sessionId);
  const setsBySession =
    sessionIds.length === 0
      ? []
      : groupLoggedSetsBySession(
          await db
            .select({
              sessionId: loggedSets.sessionId,
              weightKg: loggedSets.weightKg,
              reps: loggedSets.reps,
            })
            .from(loggedSets)
            .where(inArray(loggedSets.sessionId, sessionIds)),
        );

  const stats = buildUserStats(completedSessions, setsBySession, recentLimit);

  res.json({
    period: {
      from: stats.period.from.toISOString(),
      to: stats.period.to.toISOString(),
    },
    volumeKg: stats.volumeKg,
    workoutsPerWeek: stats.workoutsPerWeek,
    streakDays: stats.streakDays,
    recordVolumeKg: stats.recordVolumeKg,
    recentSessions: stats.recentSessions.map((session) => ({
      sessionId: session.sessionId,
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      completedAt: session.completedAt.toISOString(),
      durationMin: session.durationMin,
      volumeKg: session.volumeKg,
    })),
  });
});
