import { Router } from "express";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db";
import { exercises, workouts } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { findWorkoutForUser } from "../services/workoutAccess";
import { getAuthUser } from "../types/auth";
import { exercisesRouter } from "./exercises";

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);

workoutsRouter.get("/", async (req, res) => {
  const user = getAuthUser(req);

  const all = await db
    .select({
      id: workouts.id,
      name: workouts.name,
      createdAt: workouts.createdAt,
      exerciseCount: count(exercises.id),
    })
    .from(workouts)
    .leftJoin(exercises, eq(workouts.id, exercises.workoutId))
    .where(eq(workouts.userId, user.id))
    .groupBy(workouts.id, workouts.name, workouts.createdAt);

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
      id: workouts.id,
      name: workouts.name,
      createdAt: workouts.createdAt,
      exerciseCount: count(exercises.id),
    })
    .from(workouts)
    .leftJoin(exercises, eq(workouts.id, exercises.workoutId))
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)))
    .groupBy(workouts.id, workouts.name, workouts.createdAt);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  res.json(workout);
});

workoutsRouter.post("/", async (req, res) => {
  const user = getAuthUser(req);
  const { name } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [created] = await db
    .insert(workouts)
    .values({ name, userId: user.id })
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
