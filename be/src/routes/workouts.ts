import { Router } from "express";
import { count, eq } from "drizzle-orm";
import { db } from "../db";
import { exercises, workouts } from "../db/schema";
import { exercisesRouter } from "./exercises";

export const workoutsRouter = Router();

workoutsRouter.get("/", async (_req, res) => {
  const all = await db
    .select({
      id: workouts.id,
      name: workouts.name,
      createdAt: workouts.createdAt,
      exerciseCount: count(exercises.id),
    })
    .from(workouts)
    .leftJoin(exercises, eq(workouts.id, exercises.workoutId))
    .groupBy(workouts.id, workouts.name, workouts.createdAt);

  res.json(all);
});

workoutsRouter.get("/:id", async (req, res) => {
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
    .where(eq(workouts.id, id))
    .groupBy(workouts.id, workouts.name, workouts.createdAt);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  res.json(workout);
});

workoutsRouter.post("/", async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [created] = await db.insert(workouts).values({ name }).returning();

  res.status(201).json({ ...created, exerciseCount: 0 });
});

workoutsRouter.use("/:workoutId/exercises", exercisesRouter);
