import { Router } from "express";
import {
  deleteScheduleOverride,
  findWorkoutDayForUser,
  resolveWorkoutDayForDate,
  upsertScheduleOverride,
} from "../services/workoutDayAccess";
import { validateScheduleOverrideInput } from "../services/workoutDayValidation";
import { findWorkoutForUser } from "../services/workoutAccess";
import { getRomeWeekday, parseScheduledDate, toRomeDateKey } from "../services/workoutSchedule";
import { getAuthUser } from "../types/auth";

export const workoutScheduleRouter = Router({ mergeParams: true });

function parseWorkoutId(params: Record<string, string | undefined>): number {
  return Number(params.workoutId);
}

workoutScheduleRouter.get("/today", async (req, res) => {
  const user = getAuthUser(req);
  const workoutId = parseWorkoutId(req.params);
  const dateParam = typeof req.query.date === "string" ? req.query.date : null;
  const date = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date();
  const dateKey = dateParam ?? toRomeDateKey(date);

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  if (dateParam && !parseScheduledDate(dateParam)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }

  const workout = await findWorkoutForUser(workoutId, user.id);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  const resolved = await resolveWorkoutDayForDate(workoutId, user.id, date);

  res.json({
    date: dateKey,
    weekday: getRomeWeekday(date),
    workoutDay: resolved
      ? {
          id: resolved.workoutDayId,
          name: resolved.workoutDayName,
        }
      : null,
    source: resolved?.source ?? null,
  });
});

workoutScheduleRouter.post("/overrides", async (req, res) => {
  const user = getAuthUser(req);
  const workoutId = parseWorkoutId(req.params);
  const parsed = validateScheduleOverrideInput(req.body);

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

  const day = await findWorkoutDayForUser(parsed.value.workoutDayId, user.id);

  if (!day || day.workoutId !== workoutId) {
    res.status(400).json({ error: "workoutDayId does not belong to this workout" });
    return;
  }

  await upsertScheduleOverride(
    user.id,
    workoutId,
    parsed.value.scheduledDate,
    parsed.value.workoutDayId,
  );

  res.status(201).json({
    scheduledDate: parsed.value.scheduledDate,
    workoutDayId: parsed.value.workoutDayId,
    workoutDayName: day.name,
  });
});

workoutScheduleRouter.delete("/overrides/:date", async (req, res) => {
  const user = getAuthUser(req);
  const workoutId = parseWorkoutId(req.params);
  const scheduledDate = req.params.date;

  if (Number.isNaN(workoutId)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  if (!parseScheduledDate(scheduledDate)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }

  const workout = await findWorkoutForUser(workoutId, user.id);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  const deleted = await deleteScheduleOverride(user.id, workoutId, scheduledDate);

  if (!deleted) {
    res.status(404).json({ error: "Schedule override not found" });
    return;
  }

  res.status(204).send();
});
