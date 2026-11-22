import { Router } from "express";
import {
  loadMealDayAdherence,
  loadMealPlan,
  saveMealPlan,
  setMealPlanActive,
} from "../services/mealPlanAccess";
import {
  createMealPlanTemplate,
  deleteMealPlanTemplate,
  listMealPlanTemplates,
  replaceMealPlanTemplate,
} from "../services/mealPlanTemplateAccess";
import {
  validateMealLogsQuery,
  validateMealPlanInput,
  validateMealPlanPatch,
  validateMealPlanTemplateInput,
  validateMealTagInput,
  validateMealTagPatch,
} from "../services/mealPlanValidation";
import { createMealTag, listMealTags, updateMealTag } from "../services/mealTagAccess";
import { isDatabaseId } from "../services/subscriptionValidation";
import { getAuthUser } from "../types/auth";
import { findClientAthleteId } from "./coachsubscriptions";

/**
 * The coach's meal tags and day templates, and each client's meal plan and how it is
 * followed. Mounted inside `coachRouter`, after its auth.
 */
export const coachMealPlanRouter = Router();

coachMealPlanRouter.get("/meal-tags", async (req, res) => {
  const coach = getAuthUser(req);
  const mealTags = await listMealTags(coach.id);
  res.json({ mealTags });
});

coachMealPlanRouter.post("/meal-tags", async (req, res) => {
  const parsed = validateMealTagInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const created = await createMealTag(coach.id, parsed.value);

  if (!created.ok) {
    res.status(created.status).json({ error: created.error });
    return;
  }

  res.status(201).json(created.value);
});

coachMealPlanRouter.patch("/meal-tags/:id", async (req, res) => {
  const tagId = Number(req.params.id);

  if (!isDatabaseId(tagId)) {
    res.status(400).json({ error: "Invalid meal tag id" });
    return;
  }

  const parsed = validateMealTagPatch(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const updated = await updateMealTag(coach.id, tagId, parsed.value);

  if (!updated.ok) {
    res.status(updated.status).json({ error: updated.error });
    return;
  }

  res.json(updated.value);
});

coachMealPlanRouter.get("/meal-plan-templates", async (req, res) => {
  const coach = getAuthUser(req);
  const mealPlanTemplates = await listMealPlanTemplates(coach.id);
  res.json({ mealPlanTemplates });
});

coachMealPlanRouter.post("/meal-plan-templates", async (req, res) => {
  const parsed = validateMealPlanTemplateInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const created = await createMealPlanTemplate(coach.id, parsed.value);

  if (!created.ok) {
    res.status(created.status).json({ error: created.error });
    return;
  }

  res.status(201).json(created.value);
});

coachMealPlanRouter.put("/meal-plan-templates/:id", async (req, res) => {
  const templateId = Number(req.params.id);

  if (!isDatabaseId(templateId)) {
    res.status(400).json({ error: "Invalid meal plan template id" });
    return;
  }

  const parsed = validateMealPlanTemplateInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const replaced = await replaceMealPlanTemplate(coach.id, templateId, parsed.value);

  if (!replaced.ok) {
    res.status(replaced.status).json({ error: replaced.error });
    return;
  }

  res.json(replaced.value);
});

coachMealPlanRouter.delete("/meal-plan-templates/:id", async (req, res) => {
  const templateId = Number(req.params.id);

  if (!isDatabaseId(templateId)) {
    res.status(400).json({ error: "Invalid meal plan template id" });
    return;
  }

  const coach = getAuthUser(req);
  const isDeleted = await deleteMealPlanTemplate(coach.id, templateId);

  if (!isDeleted) {
    res.status(404).json({ error: "Meal plan template not found" });
    return;
  }

  res.status(204).end();
});

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
