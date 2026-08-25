import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { exercises, workoutDays, workouts } from "../db/schema";
import {
  createExerciseWithSets,
  enrichExercises,
  parseExerciseBody,
} from "../services/exerciseAccess";
import {
  findTakenWeekdaysForWorkout,
  findWeekdayConflict,
  findWorkoutDayForUser,
  listEnrichedWorkoutDays,
  listWorkoutDaysForWorkout,
  replaceWeekdaysForDay,
} from "../services/workoutDayAccess";
import {
  validateCreateWorkoutDayInput,
  validateSetWeekdaysInput,
  validateUpdateWorkoutDayInput,
} from "../services/workoutDayValidation";
import { findWorkoutForUser } from "../services/workoutAccess";
import { getAuthUser } from "../types/auth";

export const workoutDaysRouter = Router({ mergeParams: true });

function parseWorkoutId(params: Record<string, string | undefined>): number {
  return Number(params.workoutId);
}

function parseDayId(params: Record<string, string | undefined>): number {
  return Number(params.dayId);
}

async function enrichWorkoutDays(workoutId: number) {
  return listEnrichedWorkoutDays(workoutId);
}

workoutDaysRouter.get("/", async (req, res) => {
  const workoutId = parseWorkoutId(req.params);

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  res.json(await enrichWorkoutDays(workoutId));
});

workoutDaysRouter.post("/", async (req, res) => {
  const user = getAuthUser(req);
  const workoutId = parseWorkoutId(req.params);
  const parsed = validateCreateWorkoutDayInput(req.body);

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

  const weekdays = parsed.value.weekdays;

  if (weekdays.length > 0) {
    const taken = await findTakenWeekdaysForWorkout(workoutId);
    const conflict = findWeekdayConflict(weekdays, taken);

    if (conflict !== undefined) {
      res.status(409).json({ error: "Another workout day is already scheduled on that weekday" });
      return;
    }
  }

  const [created] = await db
    .insert(workoutDays)
    .values({
      workoutId,
      name: parsed.value.name,
      sortOrder: parsed.value.sortOrder,
    })
    .returning();

  await replaceWeekdaysForDay(created.id, weekdays);

  const [enriched] = await enrichWorkoutDays(workoutId).then((days) =>
    days.filter((day) => day.id === created.id),
  );

  res.status(201).json(enriched);
});

workoutDaysRouter.get("/:dayId", async (req, res) => {
  const user = getAuthUser(req);
  const dayId = parseDayId(req.params);

  if (Number.isNaN(dayId)) {
    res.status(400).json({ error: "Invalid day id" });
    return;
  }

  const day = await findWorkoutDayForUser(dayId, user.id);

  if (!day) {
    res.status(404).json({ error: "Workout day not found" });
    return;
  }

  const [enriched] = await enrichWorkoutDays(day.workoutId).then((days) =>
    days.filter((item) => item.id === dayId),
  );

  res.json(enriched);
});

workoutDaysRouter.patch("/:dayId", async (req, res) => {
  const user = getAuthUser(req);
  const dayId = parseDayId(req.params);
  const parsed = validateUpdateWorkoutDayInput(req.body);

  if (Number.isNaN(dayId)) {
    res.status(400).json({ error: "Invalid day id" });
    return;
  }

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const day = await findWorkoutDayForUser(dayId, user.id);

  if (!day) {
    res.status(404).json({ error: "Workout day not found" });
    return;
  }

  const [updated] = await db
    .update(workoutDays)
    .set(parsed.value)
    .where(eq(workoutDays.id, dayId))
    .returning();

  const [enriched] = await enrichWorkoutDays(day.workoutId).then((days) =>
    days.filter((item) => item.id === updated.id),
  );

  res.json(enriched);
});

workoutDaysRouter.delete("/:dayId", async (req, res) => {
  const user = getAuthUser(req);
  const dayId = parseDayId(req.params);

  if (Number.isNaN(dayId)) {
    res.status(400).json({ error: "Invalid day id" });
    return;
  }

  const day = await findWorkoutDayForUser(dayId, user.id);

  if (!day) {
    res.status(404).json({ error: "Workout day not found" });
    return;
  }

  const allDays = await listWorkoutDaysForWorkout(day.workoutId);

  if (allDays.length <= 1) {
    res.status(409).json({ error: "Cannot delete the only workout day" });
    return;
  }

  await db.delete(workoutDays).where(eq(workoutDays.id, dayId));

  res.status(204).send();
});

workoutDaysRouter.put("/:dayId/weekdays", async (req, res) => {
  const user = getAuthUser(req);
  const dayId = parseDayId(req.params);
  const parsed = validateSetWeekdaysInput(req.body);

  if (Number.isNaN(dayId)) {
    res.status(400).json({ error: "Invalid day id" });
    return;
  }

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const day = await findWorkoutDayForUser(dayId, user.id);

  if (!day) {
    res.status(404).json({ error: "Workout day not found" });
    return;
  }

  const weekdays = parsed.value.weekdays;

  if (weekdays.length > 0) {
    const taken = await findTakenWeekdaysForWorkout(day.workoutId, dayId);
    const conflict = findWeekdayConflict(weekdays, taken);

    if (conflict !== undefined) {
      res.status(409).json({ error: "Another workout day is already scheduled on that weekday" });
      return;
    }
  }

  await replaceWeekdaysForDay(dayId, weekdays);

  const [enriched] = await enrichWorkoutDays(day.workoutId).then((days) =>
    days.filter((item) => item.id === dayId),
  );

  res.json(enriched);
});

workoutDaysRouter.get("/:dayId/exercises", async (req, res) => {
  const user = getAuthUser(req);
  const dayId = parseDayId(req.params);

  if (Number.isNaN(dayId)) {
    res.status(400).json({ error: "Invalid day id" });
    return;
  }

  const day = await findWorkoutDayForUser(dayId, user.id);

  if (!day) {
    res.status(404).json({ error: "Workout day not found" });
    return;
  }

  const rows = await db.select().from(exercises).where(eq(exercises.workoutDayId, dayId));

  res.json(await enrichExercises(rows));
});

workoutDaysRouter.post("/:dayId/exercises", async (req, res) => {
  const user = getAuthUser(req);
  const dayId = parseDayId(req.params);

  if (Number.isNaN(dayId)) {
    res.status(400).json({ error: "Invalid day id" });
    return;
  }

  const day = await findWorkoutDayForUser(dayId, user.id);

  if (!day) {
    res.status(404).json({ error: "Workout day not found" });
    return;
  }

  const [workout] = await db
    .select({ defaultRestSec: workouts.defaultRestSec })
    .from(workouts)
    .where(eq(workouts.id, day.workoutId));

  const parsed = parseExerciseBody(req.body, workout?.defaultRestSec ?? 90);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const created = await createExerciseWithSets({
    name: parsed.value.name,
    workoutId: day.workoutId,
    workoutDayId: dayId,
    setPrescriptions: parsed.value.setPrescriptions,
    catalogId: parsed.value.catalogId,
  });

  const [enriched] = await enrichExercises([created]);
  res.status(201).json(enriched);
});
