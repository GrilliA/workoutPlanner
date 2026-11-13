import { Router } from "express";
import { todayInRome } from "../services/assignmentStatus";
import { parseBusinessRange } from "../services/coachBusiness";
import { loadCoachBusiness } from "../services/coachBusinessAccess";
import { getAuthUser } from "../types/auth";

/** The business numbers of the coach. Mounted inside `coachRouter`, after its auth. */
export const coachBusinessRouter = Router();

coachBusinessRouter.get("/business", async (req, res) => {
  const range = parseBusinessRange(req.query.range);

  if (range === null) {
    res.status(400).json({ error: "range must be 6m or 12m" });
    return;
  }

  const coach = getAuthUser(req);
  const business = await loadCoachBusiness(coach.id, todayInRome(), range);
  res.json(business);
});
