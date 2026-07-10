import { Router } from "express";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db";
import { exercises, workouts } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { findWorkoutForUser } from "../services/workoutAccess";
import { validateCreateWorkoutInput } from "../services/workoutValidation";
import { getAuthUser } from "../types/auth";
import { exercisesRouter } from "./exercises";

export const workoutsRouter = Router();

const workoutColumns = {
  id: workouts.id,
  name: workouts.name,
  defaultRestSec: workouts.defaultRestSec,
  workoutType: workouts.workoutType,
  frequency: workouts.frequency,
  createdAt: workouts.createdAt,
};

const workoutGroupBy = [
  workouts.id,
  workouts.name,
  workouts.defaultRestSec,
  workouts.workoutType,
  workouts.frequency,
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

  res.json(workout);
});

workoutsRouter.post("/", async (req, res) => {
  const user = getAuthUser(req);
  const parsed = validateCreateWorkoutInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const { name, defaultRestSec, workoutType, frequency } = parsed.value;

  const [created] = await db
    .insert(workouts)
    .values({ name, defaultRestSec, workoutType, frequency, userId: user.id })
    .returning();

  res.status(201).json({ ...created, exerciseCount: 0 });
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
