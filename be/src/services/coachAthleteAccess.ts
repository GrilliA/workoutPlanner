import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db, type Tx } from "../db";
import {
  clientSubscriptions,
  coachAthletes,
  programAssignments,
  users,
  workouts,
} from "../db/schema";
import { todayInRome } from "./assignmentStatus";
import { hasSubscriptionEnded } from "./subscription";

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

/** A client who leaves is a lost client: the subscription stays, ended, for the business numbers. */
const endOpenSubscription = async (tx: Tx, coachId: number, athleteId: number) => {
  const [subscription] = await tx
    .select({
      id: clientSubscriptions.id,
      startedOn: clientSubscriptions.startedOn,
      endedOn: clientSubscriptions.endedOn,
    })
    .from(clientSubscriptions)
    .where(
      and(
        eq(clientSubscriptions.coachId, coachId),
        eq(clientSubscriptions.athleteId, athleteId),
      ),
    )
    .for("update");

  const today = todayInRome();

  if (!subscription || hasSubscriptionEnded(subscription.endedOn, today)) {
    return;
  }

  // endedOn cannot precede startedOn (a database check) when the subscription starts later.
  const startsLater = subscription.startedOn > today;
  const endedOn = startsLater ? subscription.startedOn : today;

  await tx
    .update(clientSubscriptions)
    .set({ endedOn, updatedAt: new Date() })
    .where(eq(clientSubscriptions.id, subscription.id));
};

/**
 * Locks the link before the subscription, in the same order as the subscription writes:
 * a write already holding the link finishes first and its subscription gets ended here,
 * a write that comes later finds no link.
 */
export const unlinkCoachAthlete = async (coachId: number, athleteId: number) => {
  const isUnlinked = await db.transaction(async (tx) => {
    const [link] = await tx
      .select({ id: coachAthletes.id })
      .from(coachAthletes)
      .where(and(eq(coachAthletes.coachId, coachId), eq(coachAthletes.athleteId, athleteId)))
      .for("update");

    if (!link) {
      return false;
    }

    await endOpenSubscription(tx, coachId, athleteId);

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

    return true;
  });

  if (!isUnlinked) {
    return null;
  }

  return { ok: true as const };
};
