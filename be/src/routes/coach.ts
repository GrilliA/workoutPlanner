import { Router } from "express";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  exercises,
  programAssignments,
  refreshTokens,
  users,
  workouts,
} from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { validateAssignmentDates, validatePartialAssignmentDates } from "../services/assignmentStatus";
import { validateResetPasswordInput } from "../services/clientValidation";
import {
  getCoachAthlete,
  listCoachAthletes,
  unlinkCoachAthlete,
} from "../services/coachAthleteAccess";
import {
  getCoachDashboardStats,
  listAthleteAssignmentsForCoach,
  listCoachAssignments,
} from "../services/coachDashboard";
import {
  getOrCreateCoachInviteCode,
  rotateCoachInviteCode,
} from "../services/coachInvite";
import { loadSessionHistoryPage } from "../services/sessionHistoryAccess";
import { hashPassword } from "../services/password";
import {
  assignBlankProgram,
  assignFromProgramInput,
  assignFromTemplate,
  coachOwnsAthleteProgram,
  revokeAssignment,
  updateAssignmentDates,
} from "../services/programAssignment";
import {
  saveWorkoutProgram,
  validateWorkoutProgramInput,
} from "../services/workoutProgram";
import { getAuthUser } from "../types/auth";
import { listProgramDaysWithExercises } from "../services/workoutDayAccess";

export const coachRouter = Router();

coachRouter.use(requireAuth, requireRole("coach"));

const templateColumns = {
  id: workouts.id,
  name: workouts.name,
  defaultRestSec: workouts.defaultRestSec,
  workoutType: workouts.workoutType,
  frequency: workouts.frequency,
  isActive: workouts.isActive,
  kind: workouts.kind,
  createdAt: workouts.createdAt,
};

const templateGroupBy = [
  workouts.id,
  workouts.name,
  workouts.defaultRestSec,
  workouts.workoutType,
  workouts.frequency,
  workouts.isActive,
  workouts.kind,
  workouts.createdAt,
] as const;

coachRouter.get("/dashboard", async (req, res) => {
  const coach = getAuthUser(req);
  const stats = await getCoachDashboardStats(coach.id);
  res.json(stats);
});

coachRouter.get("/invite-code", async (req, res) => {
  const coach = getAuthUser(req);
  const invite = await getOrCreateCoachInviteCode(coach.id);
  res.json({ code: invite.code, updatedAt: invite.updatedAt });
});

coachRouter.post("/invite-code/rotate", async (req, res) => {
  const coach = getAuthUser(req);
  const invite = await rotateCoachInviteCode(coach.id);
  res.json({ code: invite.code, updatedAt: invite.updatedAt });
});

coachRouter.get("/clients", async (req, res) => {
  const coach = getAuthUser(req);
  const clients = await listCoachAthletes(coach.id);
  res.json(clients);
});

coachRouter.post("/clients", (_req, res) => {
  res.status(410).json({
    error:
      "Creating clients is deprecated. Share your invite code so athletes can link their account.",
  });
});

coachRouter.get("/clients/:athleteId", async (req, res) => {
  const coach = getAuthUser(req);
  const athleteId = Number(req.params.athleteId);

  if (!Number.isInteger(athleteId) || athleteId < 1) {
    res.status(400).json({ error: "Invalid athlete id" });
    return;
  }

  const client = await getCoachAthlete(coach.id, athleteId);

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const [assignments, recentSessions] = await Promise.all([
    listAthleteAssignmentsForCoach(coach.id, athleteId),
    loadSessionHistoryPage(athleteId, 1, 20),
  ]);

  res.json({
    client,
    assignments,
    recentSessions: recentSessions.items,
  });
});

coachRouter.post("/clients/:athleteId/reset-password", async (req, res) => {
  const coach = getAuthUser(req);
  const athleteId = Number(req.params.athleteId);

  if (!Number.isInteger(athleteId) || athleteId < 1) {
    res.status(400).json({ error: "Invalid athlete id" });
    return;
  }

  const client = await getCoachAthlete(coach.id, athleteId);

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const parsed = validateResetPasswordInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const passwordHash = await hashPassword(parsed.value.password);

  await db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .update(users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(users.id, athleteId));

    await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(eq(refreshTokens.userId, athleteId), isNull(refreshTokens.revokedAt)),
      );
  });

  res.json({ ok: true });
});

coachRouter.delete("/clients/:athleteId", async (req, res) => {
  const coach = getAuthUser(req);
  const athleteId = Number(req.params.athleteId);

  if (!Number.isInteger(athleteId) || athleteId < 1) {
    res.status(400).json({ error: "Invalid athlete id" });
    return;
  }

  const unlinked = await unlinkCoachAthlete(coach.id, athleteId);

  if (!unlinked) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json({ ok: true });
});

coachRouter.get("/templates", async (req, res) => {
  const coach = getAuthUser(req);

  const templates = await db
    .select({
      ...templateColumns,
      exerciseCount: count(exercises.id),
    })
    .from(workouts)
    .leftJoin(exercises, eq(workouts.id, exercises.workoutId))
    .where(and(eq(workouts.userId, coach.id), eq(workouts.kind, "template")))
    .groupBy(...templateGroupBy);

  res.json(templates);
});

coachRouter.post("/templates/program", async (req, res) => {
  const coach = getAuthUser(req);
  const parsed = validateWorkoutProgramInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const result = await saveWorkoutProgram(coach.id, parsed.value, undefined, {
    kind: "template",
    createdByUserId: coach.id,
  });

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json(result.workout);
});

coachRouter.put("/templates/:id/program", async (req, res) => {
  const coach = getAuthUser(req);
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid template id" });
    return;
  }

  const [existing] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(
      and(
        eq(workouts.id, id),
        eq(workouts.userId, coach.id),
        eq(workouts.kind, "template"),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const parsed = validateWorkoutProgramInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const result = await saveWorkoutProgram(coach.id, parsed.value, id, {
    kind: "template",
    createdByUserId: coach.id,
  });

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result.workout);
});

coachRouter.get("/templates/:id", async (req, res) => {
  const coach = getAuthUser(req);
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid template id" });
    return;
  }

  const [template] = await db
    .select({
      ...templateColumns,
      exerciseCount: count(exercises.id),
    })
    .from(workouts)
    .leftJoin(exercises, eq(workouts.id, exercises.workoutId))
    .where(
      and(
        eq(workouts.id, id),
        eq(workouts.userId, coach.id),
        eq(workouts.kind, "template"),
      ),
    )
    .groupBy(...templateGroupBy);

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const days = await listProgramDaysWithExercises(id);
  res.json({ ...template, days });
});

coachRouter.get("/assignments", async (req, res) => {
  const coach = getAuthUser(req);
  const assignments = await listCoachAssignments(coach.id);
  res.json(assignments);
});

coachRouter.post("/assignments", async (req, res) => {
  const coach = getAuthUser(req);
  const body = req.body as Record<string, unknown>;
  const athleteId = Number(body.athleteId);
  const dates = validateAssignmentDates(body);

  if (!Number.isInteger(athleteId) || athleteId < 1) {
    res.status(400).json({ error: "athleteId must be a positive integer" });
    return;
  }

  if (!dates.ok) {
    res.status(400).json({ error: dates.error });
    return;
  }

  const client = await getCoachAthlete(coach.id, athleteId);

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const templateId =
    body.templateId === undefined || body.templateId === null
      ? undefined
      : Number(body.templateId);

  if (templateId !== undefined && (!Number.isInteger(templateId) || templateId < 1)) {
    res.status(400).json({ error: "templateId must be a positive integer" });
    return;
  }

  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : undefined;

  const hasProgram =
    body.program !== undefined && body.program !== null;

  if (templateId !== undefined && hasProgram) {
    res.status(400).json({ error: "Cannot combine templateId and program" });
    return;
  }

  let result;

  if (hasProgram) {
    const parsed = validateWorkoutProgramInput(body.program);

    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    result = await assignFromProgramInput(
      coach.id,
      athleteId,
      dates.value,
      parsed.value,
    );
  } else if (templateId !== undefined) {
    result = await assignFromTemplate(
      coach.id,
      athleteId,
      templateId,
      dates.value,
    );
  } else {
    result = await assignBlankProgram(
      coach.id,
      athleteId,
      dates.value,
      name,
    );
  }

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json({
    assignment: result.assignment,
    workout: result.workout,
  });
});

coachRouter.post("/assignments/:id/revoke", async (req, res) => {
  const coach = getAuthUser(req);
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid assignment id" });
    return;
  }

  const updated = await revokeAssignment(coach.id, id);

  if (!updated) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.json(updated);
});

coachRouter.patch("/assignments/:id", async (req, res) => {
  const coach = getAuthUser(req);
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid assignment id" });
    return;
  }

  const [existing] = await db
    .select({
      startsAt: programAssignments.startsAt,
      expiresAt: programAssignments.expiresAt,
      coachId: programAssignments.coachId,
    })
    .from(programAssignments)
    .where(eq(programAssignments.id, id));

  if (!existing || existing.coachId !== coach.id) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  const dates = validatePartialAssignmentDates(req.body, {
    startsAt: existing.startsAt,
    expiresAt: existing.expiresAt,
  });

  if (!dates.ok) {
    res.status(400).json({ error: dates.error });
    return;
  }

  const updated = await updateAssignmentDates(coach.id, id, dates.value);

  if (!updated) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  if ("ok" in updated && updated.ok === false) {
    res.status(updated.status).json({ error: updated.error });
    return;
  }

  res.json(updated);
});

coachRouter.put("/clients/:athleteId/programs/:workoutId", async (req, res) => {
  const coach = getAuthUser(req);
  const athleteId = Number(req.params.athleteId);
  const workoutId = Number(req.params.workoutId);

  if (!Number.isInteger(athleteId) || athleteId < 1) {
    res.status(400).json({ error: "Invalid athlete id" });
    return;
  }

  if (!Number.isInteger(workoutId) || workoutId < 1) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const client = await getCoachAthlete(coach.id, athleteId);

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const owns = await coachOwnsAthleteProgram(coach.id, athleteId, workoutId);

  if (!owns) {
    res.status(404).json({ error: "Program not found" });
    return;
  }

  const parsed = validateWorkoutProgramInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const result = await saveWorkoutProgram(athleteId, parsed.value, workoutId, {
    kind: "program",
    createdByUserId: coach.id,
  });

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result.workout);
});

coachRouter.get("/clients/:athleteId/programs/:workoutId", async (req, res) => {
  const coach = getAuthUser(req);
  const athleteId = Number(req.params.athleteId);
  const workoutId = Number(req.params.workoutId);

  if (!Number.isInteger(athleteId) || athleteId < 1) {
    res.status(400).json({ error: "Invalid athlete id" });
    return;
  }

  if (!Number.isInteger(workoutId) || workoutId < 1) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const client = await getCoachAthlete(coach.id, athleteId);

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const owns = await coachOwnsAthleteProgram(coach.id, athleteId, workoutId);

  if (!owns) {
    res.status(404).json({ error: "Program not found" });
    return;
  }

  const [program] = await db
    .select({
      ...templateColumns,
      exerciseCount: count(exercises.id),
    })
    .from(workouts)
    .leftJoin(exercises, eq(workouts.id, exercises.workoutId))
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, athleteId),
        eq(workouts.kind, "program"),
      ),
    )
    .groupBy(...templateGroupBy);

  if (!program) {
    res.status(404).json({ error: "Program not found" });
    return;
  }

  const days = await listProgramDaysWithExercises(workoutId);
  res.json({ ...program, days });
});
