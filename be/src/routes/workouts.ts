import { Router } from "express";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db";
import { exercises, workouts } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { findWorkoutForUser } from "../services/workoutAccess";
import { validateCreateWorkoutInput, validateUpdateWorkoutInput } from "../services/workoutValidation";
import { getAuthUser } from "../types/auth";
import { exercisesRouter } from "./exercises";
import { workoutDaysRouter } from "./workoutdays";
import { workoutScheduleRouter } from "./workoutschedule";
import { workoutSessionsRouter } from "./sessions";
import { ensureDefaultWorkoutDay, listEnrichedWorkoutDays } from "../services/workoutDayAccess";
import {
  saveWorkoutProgram,
  validateWorkoutProgramInput,
} from "../services/workoutProgram";

export const workoutsRouter = Router();

const workoutColumns = {
  id: workouts.id,
  name: workouts.name,
  defaultRestSec: workouts.defaultRestSec,
  workoutType: workouts.workoutType,
  frequency: workouts.frequency,
  isActive: workouts.isActive,
  createdAt: workouts.createdAt,
};

const workoutGroupBy = [
  workouts.id,
  workouts.name,
  workouts.defaultRestSec,
  workouts.workoutType,
  workouts.frequency,
  workouts.isActive,
  workouts.createdAt,
] as const;

workoutsRouter.use(requireAuth);

workoutsRouter.get("/", async (req, res) => {
  const user = getAuthUser(req);

  const all = await db
    .select({
      ...workoutColumns,
      exerciseCount: count(exercises.id),
    })
    .from(workouts)
    .leftJoin(exercises, eq(workouts.id, exercises.workoutId))
    .where(eq(workouts.userId, user.id))
    .groupBy(...workoutGroupBy);

  res.json(all);
});

workoutsRouter.post("/program", async (req, res) => {
  const user = getAuthUser(req);
  const parsed = validateWorkoutProgramInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const result = await saveWorkoutProgram(user.id, parsed.value);

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json(result.workout);
});

workoutsRouter.put("/:id/program", async (req, res) => {
  const user = getAuthUser(req);
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const parsed = validateWorkoutProgramInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const result = await saveWorkoutProgram(user.id, parsed.value, id);

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result.workout);
});

workoutsRouter.get("/:id", async (req, res) => {
  const user = getAuthUser(req);
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const [workout] = await db
    .select({
      ...workoutColumns,
      exerciseCount: count(exercises.id),
    })
    .from(workouts)
    .leftJoin(exercises, eq(workouts.id, exercises.workoutId))
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)))
    .groupBy(...workoutGroupBy);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  const days = await listEnrichedWorkoutDays(id);

  res.json({ ...workout, days });
});

workoutsRouter.post("/", async (req, res) => {
  const user = getAuthUser(req);
  const parsed = validateCreateWorkoutInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const { name, defaultRestSec, workoutType, frequency, isActive } = parsed.value;

  const [created] = await db
    .insert(workouts)
    .values({
      name,
      defaultRestSec,
      workoutType,
      frequency,
      isActive,
      userId: user.id,
    })
    .returning();

  await ensureDefaultWorkoutDay(created.id);

  res.status(201).json({ ...created, exerciseCount: 0 });
});

workoutsRouter.patch("/:id", async (req, res) => {
  const user = getAuthUser(req);
  const id = Number(req.params.id);
  const parsed = validateUpdateWorkoutInput(req.body);

  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const workout = await findWorkoutForUser(id, user.id);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  const [updated] = await db
    .update(workouts)
    .set(parsed.value)
    .where(eq(workouts.id, id))
    .returning();

  const [enriched] = await db
    .select({
      ...workoutColumns,
      exerciseCount: count(exercises.id),
    })
    .from(workouts)
    .leftJoin(exercises, eq(workouts.id, exercises.workoutId))
    .where(eq(workouts.id, id))
    .groupBy(...workoutGroupBy);

  res.json(enriched ?? { ...updated, exerciseCount: 0 });
});

workoutsRouter.use("/:workoutId/exercises", async (req, res, next) => {
  const user = getAuthUser(req);
  const workoutId = Number(req.params.workoutId);

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const workout = await findWorkoutForUser(workoutId, user.id);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  next();
}, exercisesRouter);

workoutsRouter.use("/:workoutId/days", async (req, res, next) => {
  const user = getAuthUser(req);
  const workoutId = Number(req.params.workoutId);

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const workout = await findWorkoutForUser(workoutId, user.id);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  next();
}, workoutDaysRouter);

workoutsRouter.use("/:workoutId/schedule", async (req, res, next) => {
  const user = getAuthUser(req);
  const workoutId = Number(req.params.workoutId);

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const workout = await findWorkoutForUser(workoutId, user.id);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  next();
}, workoutScheduleRouter);

workoutsRouter.use("/:workoutId/sessions", async (req, res, next) => {
  const user = getAuthUser(req);
  const workoutId = Number(req.params.workoutId);

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const workout = await findWorkoutForUser(workoutId, user.id);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  next();
}, workoutSessionsRouter);
