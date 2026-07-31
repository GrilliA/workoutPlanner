import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "../db";
import { coachAthletes, programAssignments, users, workouts } from "../db/schema";

export const findCoachAthleteLink = async (coachId: number, athleteId: number) => {
  const [link] = await db
    .select({
      id: coachAthletes.id,
      coachId: coachAthletes.coachId,
      athleteId: coachAthletes.athleteId,
    })
    .from(coachAthletes)
    .where(
      and(eq(coachAthletes.coachId, coachId), eq(coachAthletes.athleteId, athleteId)),
    );

  return link ?? null;
};

export const listCoachAthletes = async (coachId: number) =>
  db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      linkedAt: coachAthletes.createdAt,
    })
    .from(coachAthletes)
    .innerJoin(users, eq(coachAthletes.athleteId, users.id))
    .where(eq(coachAthletes.coachId, coachId))
    .orderBy(asc(users.name), asc(users.email));

export const getCoachAthlete = async (coachId: number, athleteId: number) => {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      linkedAt: coachAthletes.createdAt,
    })
    .from(coachAthletes)
    .innerJoin(users, eq(coachAthletes.athleteId, users.id))
    .where(
      and(eq(coachAthletes.coachId, coachId), eq(coachAthletes.athleteId, athleteId)),
    );

  return row ?? null;
};

export const unlinkCoachAthlete = async (coachId: number, athleteId: number) => {
  const link = await findCoachAthleteLink(coachId, athleteId);

  if (!link) {
    return null;
  }

  await db.transaction(async (tx) => {
    const assignments = await tx
      .select()
      .from(programAssignments)
      .where(
        and(
          eq(programAssignments.coachId, coachId),
          eq(programAssignments.athleteId, athleteId),
          ne(programAssignments.status, "revoked"),
        ),
      );

    if (assignments.length > 0) {
      await tx
        .update(programAssignments)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(
          inArray(
            programAssignments.id,
            assignments.map((row) => row.id),
          ),
        );

      for (const row of assignments) {
        await tx
          .update(workouts)
          .set({ isActive: false })
          .where(eq(workouts.id, row.workoutId));
      }
    }

    await tx
      .delete(coachAthletes)
      .where(
        and(eq(coachAthletes.coachId, coachId), eq(coachAthletes.athleteId, athleteId)),
      );
  });

  return { ok: true as const };
};
