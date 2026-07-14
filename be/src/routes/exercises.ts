import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { exercises, workouts } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { ensureDefaultWorkoutDay } from "../services/workoutDayAccess";
import {
  createExerciseWithSets,
  enrichExercises,
  parseExerciseBody,
  updateExerciseWithSets,
} from "../services/exerciseAccess";
import { findExerciseForUser } from "../services/workoutAccess";
import { getAuthUser } from "../types/auth";

export const exercisesRouter = Router({ mergeParams: true });

function parseWorkoutId(params: Record<string, string | undefined>) {
  return Number(params.workoutId);
}

async function getWorkoutDefaultRestSec(workoutId: number): Promise<number> {
  const [workout] = await db
    .select({ defaultRestSec: workouts.defaultRestSec })
    .from(workouts)
    .where(eq(workouts.id, workoutId));

  return workout?.defaultRestSec ?? 90;
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

  res.json(await enrichExercises(rows));
});

exercisesRouter.post("/", async (req, res) => {
  const workoutId = parseWorkoutId(req.params);

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const defaultRestSec = await getWorkoutDefaultRestSec(workoutId);
  const parsed = parseExerciseBody(req.body, defaultRestSec);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const created = await createExerciseWithSets({
    name: parsed.value.name,
    workoutId,
    workoutDayId: (await ensureDefaultWorkoutDay(workoutId)).id,
    setPrescriptions: parsed.value.setPrescriptions,
  });

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

  const [enriched] = await enrichExercises([exercise]);
  res.json(enriched);
});

exerciseByIdRouter.patch("/:id", async (req, res) => {
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

  const [workout] = await db
    .select({ defaultRestSec: workouts.defaultRestSec })
    .from(workouts)
    .where(eq(workouts.id, exercise.workoutId));

  const parsed = parseExerciseBody(req.body, workout?.defaultRestSec ?? 90);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const updated = await updateExerciseWithSets(id, parsed.value);
  res.json(updated);
});

exerciseByIdRouter.delete("/:id", async (req, res) => {
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

  await db.delete(exercises).where(eq(exercises.id, id));
  res.status(204).send();
});
