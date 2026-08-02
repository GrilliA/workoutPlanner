import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { loggedSets, workoutSessions, workouts } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import {
  findActiveSessionForUser,
  findExerciseInWorkout,
  findLoggedSetForSession,
  findSessionForUser,
} from "../services/sessionAccess";
import { findWorkoutDayForUser, resolveWorkoutDayForDate } from "../services/workoutDayAccess";
import { validateStartSessionInput } from "../services/workoutDayValidation";
import { findWorkoutForUser } from "../services/workoutAccess";
import { getActiveAssignmentForAthlete } from "../services/coachDashboard";
import { isCoachAuthoredProgram } from "../services/programOwnership";
import {
  loadSessionHistoryPage,
  parseSessionHistoryLimit,
  parseSessionHistoryPage,
} from "../services/sessionHistoryAccess";
import {
  validateLogSetInput,
  validatePatchLoggedSetInput,
  validatePatchSessionInput,
} from "../services/sessionValidation";
import { getAuthUser } from "../types/auth";

function parseWorkoutId(params: Record<string, string | undefined>): number {
  return Number(params.workoutId);
}

function parseSessionId(params: Record<string, string | undefined>): number {
  return Number(params.sessionId);
}

const isUniqueViolation = (error: unknown): boolean => {
  const databaseError = error as {
    code?: string;
    cause?: { code?: string };
  };

  return databaseError?.code === "23505" || databaseError?.cause?.code === "23505";
};

const sessionColumns = {
  id: workoutSessions.id,
  workoutId: workoutSessions.workoutId,
  workoutDayId: workoutSessions.workoutDayId,
  userId: workoutSessions.userId,
  status: workoutSessions.status,
  startedAt: workoutSessions.startedAt,
  completedAt: workoutSessions.completedAt,
  notes: workoutSessions.notes,
};

const loggedSetColumns = {
  id: loggedSets.id,
  sessionId: loggedSets.sessionId,
  exerciseId: loggedSets.exerciseId,
  setNumber: loggedSets.setNumber,
  weightKg: loggedSets.weightKg,
  reps: loggedSets.reps,
  rir: loggedSets.rir,
  tutSec: loggedSets.tutSec,
  loggedAt: loggedSets.loggedAt,
};

async function loadSessionWithSets(sessionId: number, userId: number) {
  const session = await findSessionForUser(sessionId, userId);

  if (!session) {
    return null;
  }

  const sets = await db
    .select(loggedSetColumns)
    .from(loggedSets)
    .where(eq(loggedSets.sessionId, sessionId))
    .orderBy(loggedSets.exerciseId, loggedSets.setNumber);

  return { ...session, sets };
}

export const workoutSessionsRouter = Router({ mergeParams: true });

workoutSessionsRouter.post("/", async (req, res) => {
  const user = getAuthUser(req);
  const workoutId = parseWorkoutId(req.params);
  const parsed = validateStartSessionInput(req.body);

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const workout = await findWorkoutForUser(workoutId, user.id);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  if (!workout.isActive) {
    res.status(409).json({ error: "Workout is inactive" });
    return;
  }

  if (user.role === "athlete") {
    const assignment = await getActiveAssignmentForAthlete(user.id);

    if (assignment && assignment.workoutId !== workoutId) {
      res.status(403).json({
        error:
          "A coach program is in progress. Cancel the assignment to train on another program.",
      });
      return;
    }

    if (!assignment && isCoachAuthoredProgram(workout)) {
      res.status(403).json({ error: "No active program assignment for this workout" });
      return;
    }
  }

  const activeSession = await findActiveSessionForUser(user.id);

  if (activeSession) {
    res.status(409).json({ error: "An in-progress session already exists" });
    return;
  }

  let workoutDayId = parsed.value.workoutDayId;

  if (workoutDayId !== undefined) {
    const day = await findWorkoutDayForUser(workoutDayId, user.id);

    if (!day || day.workoutId !== workoutId) {
      res.status(400).json({ error: "workoutDayId does not belong to this workout" });
      return;
    }
  } else {
    const resolved = await resolveWorkoutDayForDate(workoutId, user.id);

    if (!resolved) {
      res.status(409).json({ error: "No workout scheduled for today" });
      return;
    }

    workoutDayId = resolved.workoutDayId;
  }

  try {
    const [created] = await db
      .insert(workoutSessions)
      .values({ workoutId, workoutDayId, userId: user.id })
      .returning();

    res.status(201).json({ ...created, sets: [] });
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "An in-progress session already exists" });
      return;
    }

    throw error;
  }
});

workoutSessionsRouter.get("/", async (req, res) => {
  const user = getAuthUser(req);
  const workoutId = parseWorkoutId(req.params);

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const workout = await findWorkoutForUser(workoutId, user.id);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  const sessions = await db
    .select(sessionColumns)
    .from(workoutSessions)
    .where(and(eq(workoutSessions.workoutId, workoutId), eq(workoutSessions.userId, user.id)))
    .orderBy(desc(workoutSessions.startedAt));

  res.json(sessions);
});

export const sessionsRouter = Router();

sessionsRouter.use(requireAuth);

sessionsRouter.get("/", async (req, res) => {
  const user = getAuthUser(req);

  const sessions = await db
    .select({
      ...sessionColumns,
      workoutName: workouts.name,
    })
    .from(workoutSessions)
    .innerJoin(workouts, eq(workoutSessions.workoutId, workouts.id))
    .where(eq(workoutSessions.userId, user.id))
    .orderBy(desc(workoutSessions.startedAt));

  res.json(sessions);
});

sessionsRouter.get("/history", async (req, res) => {
  const user = getAuthUser(req);
  const page = parseSessionHistoryPage(req.query.page);
  const limit = parseSessionHistoryLimit(req.query.limit);
  const history = await loadSessionHistoryPage(user.id, page, limit);

  res.json(history);
});

sessionsRouter.get("/:id", async (req, res) => {
  const user = getAuthUser(req);
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const session = await loadSessionWithSets(id, user.id);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(session);
});

sessionsRouter.patch("/:id", async (req, res) => {
  const user = getAuthUser(req);
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const parsed = validatePatchSessionInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const session = await findSessionForUser(id, user.id);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.status !== "in_progress") {
    res.status(409).json({ error: "Session is not in progress" });
    return;
  }

  const flushSets = parsed.value.sets;

  if (flushSets !== undefined) {
    for (const set of flushSets) {
      const exercise = await findExerciseInWorkout(
        set.exerciseId,
        session.workoutId,
        session.workoutDayId,
      );

      if (!exercise) {
        res.status(400).json({ error: "Exercise does not belong to this workout" });
        return;
      }
    }

    try {
      const result = await db.transaction(async (tx) => {
        await tx.delete(loggedSets).where(eq(loggedSets.sessionId, id));

        if (flushSets.length > 0) {
          await tx.insert(loggedSets).values(
            flushSets.map((set) => ({
              sessionId: id,
              exerciseId: set.exerciseId,
              setNumber: set.setNumber,
              weightKg: set.weightKg,
              reps: set.reps,
              rir: set.rir,
              tutSec: set.tutSec,
            })),
          );
        }

        const [updated] = await tx
          .update(workoutSessions)
          .set({
            status: parsed.value.status,
            completedAt: new Date(),
          })
          .where(eq(workoutSessions.id, id))
          .returning();

        const sets = await tx
          .select(loggedSetColumns)
          .from(loggedSets)
          .where(eq(loggedSets.sessionId, id))
          .orderBy(loggedSets.exerciseId, loggedSets.setNumber);

        return { ...updated, sets };
      });

      res.json(result);
      return;
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Set already logged for this exercise and set number" });
        return;
      }

      throw error;
    }
  }

  const [updated] = await db
    .update(workoutSessions)
    .set({
      status: parsed.value.status,
      completedAt: new Date(),
    })
    .where(eq(workoutSessions.id, id))
    .returning();

  const sets = await db
    .select(loggedSetColumns)
    .from(loggedSets)
    .where(eq(loggedSets.sessionId, id))
    .orderBy(loggedSets.exerciseId, loggedSets.setNumber);

  res.json({ ...updated, sets });
});

export const sessionSetsRouter = Router({ mergeParams: true });

sessionSetsRouter.use(requireAuth);

sessionSetsRouter.post("/", async (req, res) => {
  const user = getAuthUser(req);
  const sessionId = parseSessionId(req.params);

  if (Number.isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const parsed = validateLogSetInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const session = await findSessionForUser(sessionId, user.id);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.status !== "in_progress") {
    res.status(409).json({ error: "Session is not in progress" });
    return;
  }

  const exercise = await findExerciseInWorkout(
    parsed.value.exerciseId,
    session.workoutId,
    session.workoutDayId,
  );

  if (!exercise) {
    res.status(400).json({ error: "Exercise does not belong to this workout" });
    return;
  }

  try {
    const [created] = await db
      .insert(loggedSets)
      .values({
        sessionId,
        exerciseId: parsed.value.exerciseId,
        setNumber: parsed.value.setNumber,
        weightKg: parsed.value.weightKg,
        reps: parsed.value.reps,
        rir: parsed.value.rir,
        tutSec: parsed.value.tutSec,
      })
      .returning();

    res.status(201).json(created);
  } catch {
    res.status(409).json({ error: "Set already logged for this exercise and set number" });
  }
});

sessionSetsRouter.patch("/:setId", async (req, res) => {
  const user = getAuthUser(req);
  const sessionId = parseSessionId(req.params);
  const setId = Number(req.params.setId);

  if (Number.isNaN(sessionId) || Number.isNaN(setId)) {
    res.status(400).json({ error: "Invalid session or set id" });
    return;
  }

  const parsed = validatePatchLoggedSetInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const session = await findSessionForUser(sessionId, user.id);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.status !== "in_progress") {
    res.status(409).json({ error: "Session is not in progress" });
    return;
  }

  const existing = await findLoggedSetForSession(setId, sessionId);

  if (!existing) {
    res.status(404).json({ error: "Set not found" });
    return;
  }

  const [updated] = await db
    .update(loggedSets)
    .set(parsed.value)
    .where(eq(loggedSets.id, setId))
    .returning();

  res.json(updated);
});

sessionSetsRouter.delete("/:setId", async (req, res) => {
  const user = getAuthUser(req);
  const sessionId = parseSessionId(req.params);
  const setId = Number(req.params.setId);

  if (Number.isNaN(sessionId) || Number.isNaN(setId)) {
    res.status(400).json({ error: "Invalid session or set id" });
    return;
  }

  const session = await findSessionForUser(sessionId, user.id);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.status !== "in_progress") {
    res.status(409).json({ error: "Session is not in progress" });
    return;
  }

  const existing = await findLoggedSetForSession(setId, sessionId);

  if (!existing) {
    res.status(404).json({ error: "Set not found" });
    return;
  }

  await db.delete(loggedSets).where(eq(loggedSets.id, setId));

  res.status(204).send();
});
