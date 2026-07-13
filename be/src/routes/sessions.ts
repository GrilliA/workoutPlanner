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
import { findWorkoutForUser } from "../services/workoutAccess";
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

const sessionColumns = {
  id: workoutSessions.id,
  workoutId: workoutSessions.workoutId,
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

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const workout = await findWorkoutForUser(workoutId, user.id);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  const activeSession = await findActiveSessionForUser(user.id);

  if (activeSession) {
    res.status(409).json({ error: "An in-progress session already exists" });
    return;
  }

  const [created] = await db
    .insert(workoutSessions)
    .values({ workoutId, userId: user.id })
    .returning();

  res.status(201).json({ ...created, sets: [] });
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

  const exercise = await findExerciseInWorkout(parsed.value.exerciseId, session.workoutId);

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
