import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { getActiveAssignmentForAthlete } from "../services/coachDashboard";
import { getAuthUser } from "../types/auth";

export const assignmentsRouter = Router();

assignmentsRouter.use(requireAuth);

assignmentsRouter.get("/active", async (req, res) => {
  const user = getAuthUser(req);
  const assignment = await getActiveAssignmentForAthlete(user.id);
  res.json({ assignment });
});
