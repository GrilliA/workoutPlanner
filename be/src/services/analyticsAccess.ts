import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../db";
import {
  exercises,
  loggedSets,
  programAssignments,
  workoutSessions,
  workouts,
} from "../db/schema";
import { todayInRome } from "./assignmentStatus";
import {
  buildAnalyticsSummary,
  buildExerciseProgressionsFromLoggedSets,
  buildRangePeriods,
  groupLoggedSetsBySessionWithExercise,
  type StatsRange,
} from "./analytics";
import {
  computeSessionDurationMin,
  computeSessionVolumeKg,
  groupLoggedSetsBySession,
  toRomeDateKey,
} from "./stats";

export type LoadedAthleteAnalytics = ReturnType<typeof buildAnalyticsSummary> & {
  exerciseProgressions: ReturnType<typeof buildExerciseProgressionsFromLoggedSets>;
  recentSessions: Array<{
    sessionId: number;
    workoutId: number;
    workoutName: string;
    completedAt: string;
    durationMin: number;
    volumeKg: number;
  }>;
};

const loadCompletedSessions = async (userId: number) => {
  const rows = await db
    .select({
      sessionId: workoutSessions.id,
      workoutId: workoutSessions.workoutId,
      workoutName: workouts.name,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
    })
    .from(workoutSessions)
    .innerJoin(workouts, eq(workoutSessions.workoutId, workouts.id))
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "completed")))
    .orderBy(desc(workoutSessions.completedAt));

  return rows.flatMap((row) => {
    if (!row.completedAt) {
      return [];
    }

    return [
      {
        sessionId: row.sessionId,
        workoutId: row.workoutId,
        workoutName: row.workoutName,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
      },
    ];
  });
};

export const loadAthleteAnalytics = async (
  userId: number,
  range: StatsRange,
): Promise<LoadedAthleteAnalytics> => {
  const sessions = await loadCompletedSessions(userId);
  const sessionIds = sessions.map((session) => session.sessionId);

  const loggedSetsRows =
    sessionIds.length === 0
      ? []
      : await db
          .select({
            sessionId: loggedSets.sessionId,
            exerciseId: loggedSets.exerciseId,
            exerciseName: exercises.name,
            weightKg: loggedSets.weightKg,
            reps: loggedSets.reps,
          })
          .from(loggedSets)
          .innerJoin(exercises, eq(loggedSets.exerciseId, exercises.id))
          .where(inArray(loggedSets.sessionId, sessionIds));

  const setsBySession = groupLoggedSetsBySession(loggedSetsRows);
  const setsBySessionWithExercise = groupLoggedSetsBySessionWithExercise(loggedSetsRows);
  const periods = buildRangePeriods(range);

  const summary = buildAnalyticsSummary({
    range,
    sessions,
    setsBySession,
    setsBySessionWithExercise,
  });

  const exerciseProgressions = buildExerciseProgressionsFromLoggedSets(
    sessions,
    loggedSetsRows,
    periods.current,
  );

  const recentSessions = sessions.slice(0, 5).map((session) => {
    const sets =
      setsBySession.find((group) => group.sessionId === session.sessionId)?.sets ?? [];

    return {
      sessionId: session.sessionId,
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      completedAt: session.completedAt.toISOString(),
      durationMin: computeSessionDurationMin(session.startedAt, session.completedAt),
      volumeKg: computeSessionVolumeKg(sets),
    };
  });

  return {
    ...summary,
    exerciseProgressions,
    recentSessions,
  };
};

export const loadLastSessionDate = async (userId: number): Promise<string | null> => {
  const [row] = await db
    .select({ completedAt: workoutSessions.completedAt })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "completed")))
    .orderBy(desc(workoutSessions.completedAt))
    .limit(1);

  if (!row?.completedAt) {
    return null;
  }

  return toRomeDateKey(row.completedAt);
};

export const loadActiveProgramExpiry = async (
  userId: number,
  today = todayInRome(),
): Promise<string | null> => {
  const [row] = await db
    .select({ expiresAt: programAssignments.expiresAt })
    .from(programAssignments)
    .where(
      and(
        eq(programAssignments.athleteId, userId),
        lte(programAssignments.startsAt, today),
        gte(programAssignments.expiresAt, today),
      ),
    )
    .orderBy(desc(programAssignments.id))
    .limit(1);

  return row?.expiresAt ?? null;
};
