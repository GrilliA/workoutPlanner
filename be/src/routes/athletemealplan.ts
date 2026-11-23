import { Router } from "express";
import { todayInRome } from "../services/assignmentStatus";
import { mealPlanTodayFrom } from "../services/athleteNutrition";
import { findLinkedCoachId } from "../services/coachInvite";
import { dailyAdherence } from "../services/mealPlan";
import {
  deleteMealLog,
  loadActiveMealPlanDay,
  loadMealDayAdherence,
  saveMealLog,
} from "../services/mealPlanAccess";
import {
  validateMealLogInput,
  validateMealLogKey,
  validateMealLogsQuery,
} from "../services/mealPlanValidation";
import { getAuthUser } from "../types/auth";

/**
 * The athlete's side of the meal plan: today's plan of the linked coach and the athlete's logs.
 * Mounted inside `athleteRouter`, after its auth.
 */
export const athleteMealPlanRouter = Router();

athleteMealPlanRouter.get("/meal-plan/today", async (req, res) => {
  const athlete = getAuthUser(req);
  const today = todayInRome();
  const coachId = await findLinkedCoachId(athlete.id);
  const day = coachId === null ? null : await loadActiveMealPlanDay(coachId, athlete.id, today);
  res.json(mealPlanTodayFrom(day, today));
});

athleteMealPlanRouter.put("/meal-logs", async (req, res) => {
  const parsed = validateMealLogInput(req.body, new Date());

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const athlete = getAuthUser(req);
  const saved = await saveMealLog(athlete.id, parsed.value);

  if (!saved.ok) {
    res.status(saved.status).json({ error: saved.error });
    return;
  }

  res.json(saved.value);
});

athleteMealPlanRouter.delete("/meal-logs", async (req, res) => {
  const parsed = validateMealLogKey(req.query, new Date());

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const athlete = getAuthUser(req);
  const failure = await deleteMealLog(athlete.id, parsed.value);

  if (failure !== null) {
    res.status(failure.status).json({ error: failure.error });
    return;
  }

  res.status(204).end();
});

// The same days as the coach's view of this athlete: same plan, same counts.
athleteMealPlanRouter.get("/meal-logs", async (req, res) => {
  const parsed = validateMealLogsQuery(req.query);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const athlete = getAuthUser(req);
  const coachId = await findLinkedCoachId(athlete.id);

  if (coachId === null) {
    const days = dailyAdherence({ from: parsed.value.from, to: parsed.value.to, mealIds: [], logs: [] });
    res.json({ days });
    return;
  }

  const days = await loadMealDayAdherence(coachId, athlete.id, parsed.value);
  res.json({ days });
});
