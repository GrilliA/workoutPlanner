import { Router } from "express";
import {
  loadMealDayAdherence,
  loadMealPlan,
  saveMealPlan,
  setMealPlanActive,
} from "../services/mealPlanAccess";
import {
  validateMealLogsQuery,
  validateMealPlanInput,
  validateMealPlanPatch,
} from "../services/mealPlanValidation";
import { getAuthUser } from "../types/auth";
import { findClientAthleteId } from "./coachsubscriptions";

/** The client's meal plan and how it is followed. Mounted inside `coachRouter`, after its auth. */
export const coachMealPlanRouter = Router();

coachMealPlanRouter.get("/clients/:athleteId/meal-plan", async (req, res) => {
  const athleteId = await findClientAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const coach = getAuthUser(req);
  const mealPlan = await loadMealPlan(coach.id, athleteId);
  res.json({ mealPlan });
});

coachMealPlanRouter.put("/clients/:athleteId/meal-plan", async (req, res) => {
  const athleteId = await findClientAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const parsed = validateMealPlanInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const saved = await saveMealPlan(coach.id, athleteId, parsed.value);

  if (!saved.ok) {
    res.status(saved.status).json({ error: saved.error });
    return;
  }

  const status = saved.value.isCreated ? 201 : 200;
  res.status(status).json(saved.value.mealPlan);
});

coachMealPlanRouter.patch("/clients/:athleteId/meal-plan", async (req, res) => {
  const athleteId = await findClientAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const parsed = validateMealPlanPatch(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const mealPlan = await setMealPlanActive(coach.id, athleteId, parsed.value.isActive);

  if (mealPlan === null) {
    res.status(404).json({ error: "Meal plan not found" });
    return;
  }

  res.json(mealPlan);
});

coachMealPlanRouter.get("/clients/:athleteId/meal-logs", async (req, res) => {
  const athleteId = await findClientAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const parsed = validateMealLogsQuery(req.query);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const days = await loadMealDayAdherence(coach.id, athleteId, parsed.value);
  res.json({ days });
});
