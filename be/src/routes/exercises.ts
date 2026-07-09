import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { exercises } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { findExerciseForUser } from "../services/workoutAccess";
import { getAuthUser } from "../types/auth";

export const exercisesRouter = Router({ mergeParams: true });

function parseWorkoutId(params: Record<string, string | undefined>) {
  return Number(params.workoutId);
}

exercisesRouter.get("/", async (req, res) => {
  const workoutId = parseWorkoutId(req.params);

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const rows = await db
    .select()
    .from(exercises)
    .where(eq(exercises.workoutId, workoutId));

  res.json(rows);
});

exercisesRouter.post("/", async (req, res) => {
  const workoutId = parseWorkoutId(req.params);
  const { name, sets, reps } = req.body;

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  if (sets !== undefined && (typeof sets !== "number" || !Number.isInteger(sets))) {
    res.status(400).json({ error: "sets must be an integer" });
    return;
  }

  if (reps !== undefined && (typeof reps !== "number" || !Number.isInteger(reps))) {
    res.status(400).json({ error: "reps must be an integer" });
    return;
  }

  const [created] = await db
    .insert(exercises)
    .values({ name, sets, reps, workoutId })
    .returning();

  res.status(201).json(created);
});

export const exerciseByIdRouter = Router();

exerciseByIdRouter.use(requireAuth);

exerciseByIdRouter.get("/:id", async (req, res) => {
  const user = getAuthUser(req);
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid exercise id" });
    return;
  }

  const exercise = await findExerciseForUser(id, user.id);

  if (!exercise) {
    res.status(404).json({ error: "Exercise not found" });
    return;
  }

  res.json(exercise);
});
