import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { getActiveAssignmentForAthlete } from "../services/coachDashboard";
import { revokeAssignmentForParticipant } from "../services/programAssignment";
import { getAuthUser } from "../types/auth";

export const assignmentsRouter = Router();

assignmentsRouter.use(requireAuth);

assignmentsRouter.get("/active", async (req, res) => {
  const user = getAuthUser(req);
  const assignment = await getActiveAssignmentForAthlete(user.id);
  res.json({ assignment });
});

assignmentsRouter.post("/active/revoke", async (req, res) => {
  const user = getAuthUser(req);
  const assignment = await getActiveAssignmentForAthlete(user.id);

  if (!assignment) {
    res.status(404).json({ error: "No active assignment" });
    return;
  }

  const revoked = await revokeAssignmentForParticipant(user.id, assignment.id);

  if (!revoked) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.json(revoked);
});

assignmentsRouter.post("/:id/revoke", async (req, res) => {
  const user = getAuthUser(req);
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid assignment id" });
    return;
  }

  const revoked = await revokeAssignmentForParticipant(user.id, id);

  if (!revoked) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.json(revoked);
});
