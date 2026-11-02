import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  max,
  ne,
} from "drizzle-orm";
import { db, type Tx } from "../db";
import {
  clientSubscriptions,
  coachAthletes,
  programAssignments,
  subscriptionPauses,
  users,
  workoutDays,
  workoutSessions,
  workouts,
} from "../db/schema";
import { todayInRome } from "./assignmentStatus";
import { FREQUENCY_WINDOW_DAYS, trainingFrequency } from "./clientActivity";
import { addRomeDays, toRomeDateKey } from "./stats";
import { hasSubscriptionEnded, subscriptionState, type PauseDates } from "./subscription";

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

/** Subscriptions of linked clients only: an ex client's row stays for the business numbers. */
const listLinkedSubscriptions = (coachId: number) =>
  db
    .select({
      id: clientSubscriptions.id,
      athleteId: clientSubscriptions.athleteId,
      paidThrough: clientSubscriptions.paidThrough,
      endedOn: clientSubscriptions.endedOn,
    })
    .from(clientSubscriptions)
    .innerJoin(
      coachAthletes,
      and(
        eq(coachAthletes.coachId, clientSubscriptions.coachId),
        eq(coachAthletes.athleteId, clientSubscriptions.athleteId),
      ),
    )
    .where(eq(clientSubscriptions.coachId, coachId));

/** Newest start first: with dirty data the first pause of a subscription wins, as in `findActivePause`. */
const listCoachLivePauses = (coachId: number, today: string) =>
  db
    .select({
      subscriptionId: subscriptionPauses.subscriptionId,
      startsOn: subscriptionPauses.startsOn,
      endsOn: subscriptionPauses.endsOn,
    })
    .from(subscriptionPauses)
    .innerJoin(clientSubscriptions, eq(clientSubscriptions.id, subscriptionPauses.subscriptionId))
    .where(
      and(
        eq(clientSubscriptions.coachId, coachId),
        isNull(subscriptionPauses.cancelledAt),
        gte(subscriptionPauses.endsOn, today),
      ),
    )
    .orderBy(desc(subscriptionPauses.startsOn));

// Every session of a linked athlete counts, also outside this coach's programs.
const isCompletedSessionOfCoachClient = (coachId: number) =>
  and(
    eq(coachAthletes.coachId, coachId),
    eq(workoutSessions.status, "completed"),
    isNotNull(workoutSessions.completedAt),
  );

const listLastCompletionTimes = (coachId: number) =>
  db
    .select({
      athleteId: workoutSessions.userId,
      lastCompletedAt: max(workoutSessions.completedAt),
    })
    .from(workoutSessions)
    .innerJoin(coachAthletes, eq(coachAthletes.athleteId, workoutSessions.userId))
    .where(isCompletedSessionOfCoachClient(coachId))
    .groupBy(workoutSessions.userId);

/**
 * `completed_at` holds the UTC instant without a zone. Rome is UTC+1 or +2, so midnight UTC of
 * the day before the window comes before the window starts; `trainingFrequency` drops the extra
 * rows once the instants are Rome days.
 */
const listRecentCompletedSessions = (coachId: number, today: string) => {
  const windowLowerBound = new Date(`${addRomeDays(today, -FREQUENCY_WINDOW_DAYS)}T00:00:00Z`);

  return db
    .select({ athleteId: workoutSessions.userId, completedAt: workoutSessions.completedAt })
    .from(workoutSessions)
    .innerJoin(coachAthletes, eq(coachAthletes.athleteId, workoutSessions.userId))
    .where(
      and(
        isCompletedSessionOfCoachClient(coachId),
        gte(workoutSessions.completedAt, windowLowerBound),
      ),
    );
};

/**
 * Active by its dates, as `computeAssignmentStatus` decides: the stored status changes only
 * on a sync, and this read must not write. Highest id first, as `getActiveAssignmentForAthlete`.
 */
const listActiveAssignmentDayCounts = (coachId: number, today: string) =>
  db
    .select({
      athleteId: programAssignments.athleteId,
      workoutDayCount: count(workoutDays.id),
    })
    .from(programAssignments)
    .leftJoin(workoutDays, eq(workoutDays.workoutId, programAssignments.workoutId))
    .where(
      and(
        eq(programAssignments.coachId, coachId),
        ne(programAssignments.status, "revoked"),
        lte(programAssignments.startsAt, today),
        gte(programAssignments.expiresAt, today),
      ),
    )
    .groupBy(programAssignments.id)
    .orderBy(desc(programAssignments.id));

/** The subscription of a row; `livePauses` are the coach's pauses not cancelled nor over. */
const summarizeSubscription = (
  subscription: { id: number; paidThrough: string; endedOn: string | null },
  livePauses: (PauseDates & { subscriptionId: number })[],
  today: string,
) => {
  const activePause = livePauses.find((pause) => pause.subscriptionId === subscription.id) ?? null;
  const state = subscriptionState({
    paidThrough: subscription.paidThrough,
    endedOn: subscription.endedOn,
    today,
    activePause,
  });

  return {
    status: state.status,
    paidThrough: subscription.paidThrough,
    daysLeft: state.daysLeft,
    pausedUntil: state.pausedUntil,
  };
};

/** The clients table: a fixed number of queries per request, joined in memory by athlete. */
export const listCoachClientRows = async (coachId: number, today: string) => {
  const [clients, subscriptions, livePauses, lastSessions, recentSessions, activeAssignments] =
    await Promise.all([
      listCoachAthletes(coachId),
      listLinkedSubscriptions(coachId),
      listCoachLivePauses(coachId, today),
      listLastCompletionTimes(coachId),
      listRecentCompletedSessions(coachId, today),
      listActiveAssignmentDayCounts(coachId, today),
    ]);

  return clients.map((client) => {
    const subscription = subscriptions.find((row) => row.athleteId === client.id);
    const lastCompletedAt =
      lastSessions.find((row) => row.athleteId === client.id)?.lastCompletedAt ?? null;
    const lastSessionOn = lastCompletedAt === null ? null : toRomeDateKey(lastCompletedAt);
    const completedOn = recentSessions
      .filter((row) => row.athleteId === client.id)
      .map((row) => row.completedAt)
      .filter((completedAt): completedAt is Date => completedAt !== null)
      .map((completedAt) => toRomeDateKey(completedAt));
    const activeAssignment = activeAssignments.find((row) => row.athleteId === client.id);

    return {
      ...client,
      subscription:
        subscription === undefined ? null : summarizeSubscription(subscription, livePauses, today),
      lastSessionOn,
      last14Days: trainingFrequency({
        completedOn,
        workoutDayCount: activeAssignment?.workoutDayCount ?? null,
        today,
      }),
    };
  });
};

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
