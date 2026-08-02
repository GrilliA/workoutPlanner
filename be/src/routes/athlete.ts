import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import {
  getAthleteCoach,
  linkAthleteToCoachByCode,
  unlinkAthleteFromCoach,
} from "../services/coachInvite";
import { getAuthUser } from "../types/auth";

export const athleteRouter = Router();

athleteRouter.use(requireAuth, requireRole("athlete"));

athleteRouter.get("/coach", async (req, res) => {
  const athlete = getAuthUser(req);
  const coach = await getAthleteCoach(athlete.id);
  res.json({ coach });
});

athleteRouter.post("/coach/link", async (req, res) => {
  const athlete = getAuthUser(req);
  const body = req.body as { code?: unknown } | undefined;
  const code = typeof body?.code === "string" ? body.code : "";

  if (!code.trim()) {
    res.status(400).json({ error: "Invite code is required" });
    return;
  }

  const result = await linkAthleteToCoachByCode(athlete.id, code);

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json({ coach: result.coach });
});

athleteRouter.delete("/coach", async (req, res) => {
  const athlete = getAuthUser(req);
  const unlinked = await unlinkAthleteFromCoach(athlete.id);

  if (!unlinked) {
    res.status(404).json({ error: "No linked coach" });
    return;
  }

  res.json({ ok: true });
});
