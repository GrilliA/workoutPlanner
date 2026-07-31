import { and, count, desc, eq, gte, lte, ne } from "drizzle-orm";
import { db } from "../db";
import { coachAthletes, programAssignments, users, workouts } from "../db/schema";
import {
  computeAssignmentStatus,
  daysUntilExpiry,
  todayInRome,
} from "./assignmentStatus";
import { syncAssignmentStatusesForAthlete } from "./programAssignment";

const LIST_LIMIT = 8;

export type CoachDashboardExpirationItem = {
  id: number;
  athleteId: number;
  athleteName: string | null;
  athleteEmail: string;
  workoutId: number;
  workoutName: string;
  expiresAt: string;
  daysLeft: number;
};

export type CoachDashboardExpiredItem = {
  id: number;
  athleteId: number;
  athleteName: string | null;
  athleteEmail: string;
  workoutId: number;
  workoutName: string;
  expiresAt: string;
};

export type CoachDashboardStats = {
  clientCount: number;
  templateCount: number;
  activeAssignments: number;
  scheduledAssignments: number;
  expiringIn7Days: number;
  expiringIn14Days: number;
  expiringIn30Days: number;
  expiredAssignments: number;
  expirationsByMonth: Array<{ month: string; count: number }>;
  upcomingExpirations: CoachDashboardExpirationItem[];
  expiredAssignmentsList: CoachDashboardExpiredItem[];
};

const refreshAssignmentStatuses = async (coachId: number) => {
  const today = todayInRome();
  const rows = await db
    .select()
    .from(programAssignments)
    .where(
      and(
        eq(programAssignments.coachId, coachId),
        ne(programAssignments.status, "revoked"),
      ),
    );

  for (const row of rows) {
    const next = computeAssignmentStatus(row.startsAt, row.expiresAt, today);
    if (next !== row.status) {
      await db
        .update(programAssignments)
        .set({ status: next, updatedAt: new Date() })
        .where(eq(programAssignments.id, row.id));
    }
  }
};

export const getCoachDashboardStats = async (
  coachId: number,
): Promise<CoachDashboardStats> => {
  await refreshAssignmentStatuses(coachId);

  const today = todayInRome();

  const [clientRow] = await db
    .select({ value: count() })
    .from(coachAthletes)
    .where(eq(coachAthletes.coachId, coachId));

  const [templateRow] = await db
    .select({ value: count() })
    .from(workouts)
    .where(and(eq(workouts.userId, coachId), eq(workouts.kind, "template")));

  const assignments = await db
    .select({
      id: programAssignments.id,
      workoutId: programAssignments.workoutId,
      athleteId: programAssignments.athleteId,
      startsAt: programAssignments.startsAt,
      expiresAt: programAssignments.expiresAt,
      status: programAssignments.status,
      workoutName: workouts.name,
      athleteName: users.name,
      athleteEmail: users.email,
    })
    .from(programAssignments)
    .innerJoin(workouts, eq(programAssignments.workoutId, workouts.id))
    .innerJoin(users, eq(programAssignments.athleteId, users.id))
    .where(eq(programAssignments.coachId, coachId));

  let activeAssignments = 0;
  let scheduledAssignments = 0;
  let expiredAssignments = 0;
  let expiringIn7Days = 0;
  let expiringIn14Days = 0;
  let expiringIn30Days = 0;
  const monthCounts = new Map<string, number>();
  const upcomingCandidates: CoachDashboardExpirationItem[] = [];
  const expiredCandidates: CoachDashboardExpiredItem[] = [];

  for (const row of assignments) {
    if (row.status === "revoked") {
      continue;
    }

    const status = computeAssignmentStatus(row.startsAt, row.expiresAt, today);

    if (status === "active") {
      activeAssignments += 1;
      const daysLeft = daysUntilExpiry(row.expiresAt, today);
      if (daysLeft <= 7) expiringIn7Days += 1;
      if (daysLeft <= 14) expiringIn14Days += 1;
      if (daysLeft <= 30) {
        expiringIn30Days += 1;
        upcomingCandidates.push({
          id: row.id,
          athleteId: row.athleteId,
          athleteName: row.athleteName,
          athleteEmail: row.athleteEmail,
          workoutId: row.workoutId,
          workoutName: row.workoutName,
          expiresAt: row.expiresAt,
          daysLeft,
        });
      }
    } else if (status === "scheduled") {
      scheduledAssignments += 1;
    } else if (status === "expired") {
      expiredAssignments += 1;
      expiredCandidates.push({
        id: row.id,
        athleteId: row.athleteId,
        athleteName: row.athleteName,
        athleteEmail: row.athleteEmail,
        workoutId: row.workoutId,
        workoutName: row.workoutName,
        expiresAt: row.expiresAt,
      });
    }

    const month = row.expiresAt.slice(0, 7);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }

  const expirationsByMonth = [...monthCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({ month, count }));

  const upcomingExpirations = upcomingCandidates
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.id - b.id)
    .slice(0, LIST_LIMIT);

  const expiredAssignmentsList = expiredCandidates
    .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt) || b.id - a.id)
    .slice(0, LIST_LIMIT);

  return {
    clientCount: clientRow?.value ?? 0,
    templateCount: templateRow?.value ?? 0,
    activeAssignments,
    scheduledAssignments,
    expiringIn7Days,
    expiringIn14Days,
    expiringIn30Days,
    expiredAssignments,
    expirationsByMonth,
    upcomingExpirations,
    expiredAssignmentsList,
  };
};

export const listCoachAssignments = async (coachId: number) => {
  await refreshAssignmentStatuses(coachId);

  return db
    .select({
      id: programAssignments.id,
      workoutId: programAssignments.workoutId,
      coachId: programAssignments.coachId,
      athleteId: programAssignments.athleteId,
      startsAt: programAssignments.startsAt,
      expiresAt: programAssignments.expiresAt,
      status: programAssignments.status,
      createdAt: programAssignments.createdAt,
      workoutName: workouts.name,
      athleteName: users.name,
      athleteEmail: users.email,
    })
    .from(programAssignments)
    .innerJoin(workouts, eq(programAssignments.workoutId, workouts.id))
    .innerJoin(users, eq(programAssignments.athleteId, users.id))
    .where(eq(programAssignments.coachId, coachId));
};

export const listAthleteAssignmentsForCoach = async (
  coachId: number,
  athleteId: number,
) => {
  await refreshAssignmentStatuses(coachId);

  return db
    .select({
      id: programAssignments.id,
      workoutId: programAssignments.workoutId,
      coachId: programAssignments.coachId,
      athleteId: programAssignments.athleteId,
      startsAt: programAssignments.startsAt,
      expiresAt: programAssignments.expiresAt,
      status: programAssignments.status,
      createdAt: programAssignments.createdAt,
      workoutName: workouts.name,
    })
    .from(programAssignments)
    .innerJoin(workouts, eq(programAssignments.workoutId, workouts.id))
    .where(
      and(
        eq(programAssignments.coachId, coachId),
        eq(programAssignments.athleteId, athleteId),
      ),
    );
};

export const getActiveAssignmentForAthlete = async (athleteId: number) => {
  await syncAssignmentStatusesForAthlete(athleteId);
  const today = todayInRome();

  const rows = await db
    .select({
      id: programAssignments.id,
      workoutId: programAssignments.workoutId,
      coachId: programAssignments.coachId,
      athleteId: programAssignments.athleteId,
      startsAt: programAssignments.startsAt,
      expiresAt: programAssignments.expiresAt,
      status: programAssignments.status,
      workoutName: workouts.name,
      isActive: workouts.isActive,
    })
    .from(programAssignments)
    .innerJoin(workouts, eq(programAssignments.workoutId, workouts.id))
    .where(
      and(
        eq(programAssignments.athleteId, athleteId),
        ne(programAssignments.status, "revoked"),
        lte(programAssignments.startsAt, today),
        gte(programAssignments.expiresAt, today),
      ),
    )
    .orderBy(desc(programAssignments.id))
    .limit(1);

  return rows[0] ?? null;
};
