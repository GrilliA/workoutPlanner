import { Router } from "express";
import { todayInRome } from "../services/assignmentStatus";
import {
  loadCoachToday,
  markClientHandled,
  unmarkClientHandled,
} from "../services/coachTodayAccess";
import { getAuthUser } from "../types/auth";
import { findClientAthleteId } from "./coachsubscriptions";

/** The Today inbox and its "Gestito". Mounted inside `coachRouter`, after its auth. */
export const coachTodayRouter = Router();

coachTodayRouter.get("/today", async (req, res) => {
  const coach = getAuthUser(req);
  const today = await loadCoachToday(coach.id, todayInRome());
  res.json(today);
});

// No body: one sent is ignored. The link is checked again under lock before the write.
coachTodayRouter.post("/today/:athleteId/handled", async (req, res) => {
  const athleteId = await findClientAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const coach = getAuthUser(req);
  const marked = await markClientHandled(coach.id, athleteId, todayInRome());

  if (!marked.ok) {
    res.status(marked.status).json({ error: marked.error });
    return;
  }

  res.status(204).end();
});

coachTodayRouter.delete("/today/:athleteId/handled", async (req, res) => {
  const athleteId = await findClientAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const coach = getAuthUser(req);
  await unmarkClientHandled(coach.id, athleteId);
  res.status(204).end();
});
