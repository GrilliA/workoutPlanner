import { and, between, eq, gt, gte, inArray, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import {
  coachAthletes,
  coachInboxHandled,
  exercises,
  loggedSets,
  workoutSessions,
} from "../db/schema";
import { daysWithoutSession } from "./churnRisk";
import { loadCoachClientSnapshots } from "./coachAthleteAccess";
import { listCoachRecentActivity } from "./coachDashboard";
import {
  buildInbox,
  inboxItem,
  PERSONAL_RECORD_WINDOW_DAYS,
  recentPersonalRecords,
} from "./coachToday";
import { addRomeDays, toRomeDateKey } from "./stats";

type Failure = { ok: false; status: 404; error: string };
type Result = { ok: true } | Failure;

const CLIENT_NOT_FOUND: Failure = { ok: false, status: 404, error: "Client not found" };

const listHandledClients = (coachId: number) =>
  db
    .select({
      athleteId: coachInboxHandled.athleteId,
      handledAt: coachInboxHandled.handledAt,
      severityAtHandle: coachInboxHandled.severityAtHandle,
    })
    .from(coachInboxHandled)
    .where(eq(coachInboxHandled.coachId, coachId));

/**
 * The whole history of the clients who completed a session in the window: a record beats every
 * earlier session. Only the sets `computeE1RM` can score; it checks them again.
 * The lower bound is midnight UTC of the day before the window, as in R4: the exact Rome days
 * are cut by `recentPersonalRecords`.
 */
const listRecordSets = async (coachId: number, today: string) => {
  const recordLowerBound = new Date(
    `${addRomeDays(today, -PERSONAL_RECORD_WINDOW_DAYS)}T00:00:00Z`,
  );
  const recentSessions = alias(workoutSessions, "recent_sessions");
  const recentLinks = alias(coachAthletes, "recent_links");
  // Scoped to the coach: otherwise it reads the recent sessions of every athlete in the app.
  const athletesWithRecentSession = db
    .select({ athleteId: recentSessions.userId })
    .from(recentSessions)
    .innerJoin(recentLinks, eq(recentLinks.athleteId, recentSessions.userId))
    .where(
      and(
        eq(recentLinks.coachId, coachId),
        eq(recentSessions.status, "completed"),
        gte(recentSessions.completedAt, recordLowerBound),
      ),
    );

  const rows = await db
    .select({
      athleteId: workoutSessions.userId,
      sessionId: loggedSets.sessionId,
      completedAt: workoutSessions.completedAt,
      catalogId: exercises.catalogId,
      exerciseName: exercises.name,
      weightKg: loggedSets.weightKg,
      reps: loggedSets.reps,
    })
    .from(loggedSets)
    .innerJoin(workoutSessions, eq(workoutSessions.id, loggedSets.sessionId))
    .innerJoin(coachAthletes, eq(coachAthletes.athleteId, workoutSessions.userId))
    .innerJoin(exercises, eq(exercises.id, loggedSets.exerciseId))
    .where(
      and(
        eq(coachAthletes.coachId, coachId),
        eq(workoutSessions.status, "completed"),
        isNotNull(workoutSessions.completedAt),
        gt(loggedSets.weightKg, 0),
        between(loggedSets.reps, 1, 12),
        inArray(workoutSessions.userId, athletesWithRecentSession),
      ),
    );

  // The filter keeps completed sessions only; the column type still allows null.
  return rows.flatMap((row) => {
    if (row.completedAt === null) {
      return [];
    }

    return [{ ...row, completedAt: row.completedAt }];
  });
};

/** Today's rows before "Gestito": the clients table queries plus the record sets. */
const loadInboxEntries = async (coachId: number, today: string) => {
  const [snapshots, recordSets] = await Promise.all([
    loadCoachClientSnapshots(coachId, today),
    listRecordSets(coachId, today),
  ]);

  // Grouped in one pass: filtering every set once per client is quadratic on a large roster.
  const recordSetsByAthlete = new Map<number, typeof recordSets>();

  for (const set of recordSets) {
    const athleteSets = recordSetsByAthlete.get(set.athleteId);

    if (athleteSets === undefined) {
      recordSetsByAthlete.set(set.athleteId, [set]);
      continue;
    }

    athleteSets.push(set);
  }

  const entries = snapshots.flatMap(({ row, programExpiresOn }) => {
    const linkedOn = toRomeDateKey(row.linkedAt);
    const personalRecordExercises = recentPersonalRecords({
      sets: recordSetsByAthlete.get(row.id) ?? [],
      today,
    });
    const item = inboxItem({
      client: { athleteId: row.id, athleteName: row.name, athleteEmail: row.email, linkedOn },
      subscription: row.subscription,
      lastSessionOn: row.lastSessionOn,
      last14Days: row.last14Days,
      programExpiresOn,
      personalRecordExercises,
      today,
    });

    if (item === null) {
      return [];
    }

    const days = daysWithoutSession({ lastSessionOn: row.lastSessionOn, linkedOn, today });
    return [{ item, daysWithoutSession: days }];
  });

  return { clientCount: snapshots.length, entries };
};

/** Nine statements per request, whatever the number of clients. */
export const loadCoachToday = async (coachId: number, today: string) => {
  const [inbox, handled, recentActivity] = await Promise.all([
    loadInboxEntries(coachId, today),
    listHandledClients(coachId),
    listCoachRecentActivity(coachId),
  ]);
  const { items, handledCount } = buildInbox({ entries: inbox.entries, handled, today });

  return { clientCount: inbox.clientCount, handledCount, items, recentActivity };
};

/**
 * The severity is computed here, never taken from the client: a high row cannot be hidden as low.
 * The link is locked shared first, as the subscription writes do: an unlink running now finishes
 * first, and then this write finds no link instead of failing on the foreign key.
 */
export const markClientHandled = async (
  coachId: number,
  athleteId: number,
  today: string,
): Promise<Result> => {
  const { entries } = await loadInboxEntries(coachId, today);
  const entry = entries.find((candidate) => candidate.item.athleteId === athleteId);

  // Nothing to report (paused, paid meanwhile): there is no row to hide, so nothing is written.
  if (entry === undefined) {
    return { ok: true };
  }

  const severityAtHandle = entry.item.severity;

  return db.transaction(async (tx): Promise<Result> => {
    const [link] = await tx
      .select({ id: coachAthletes.id })
      .from(coachAthletes)
      .where(and(eq(coachAthletes.coachId, coachId), eq(coachAthletes.athleteId, athleteId)))
      .for("share");

    if (!link) {
      return CLIENT_NOT_FOUND;
    }

    // The app clock, as every other write: the column holds the UTC instant without a zone.
    const handledAt = new Date();

    // Marking again starts the week over.
    await tx
      .insert(coachInboxHandled)
      .values({ coachId, athleteId, handledAt, severityAtHandle })
      .onConflictDoUpdate({
        target: [coachInboxHandled.coachId, coachInboxHandled.athleteId],
        set: { handledAt, severityAtHandle },
      });

    return { ok: true };
  });
};

/** Undoes "Gestito"; nothing stored is fine too. */
export const unmarkClientHandled = async (coachId: number, athleteId: number): Promise<void> => {
  await db
    .delete(coachInboxHandled)
    .where(
      and(eq(coachInboxHandled.coachId, coachId), eq(coachInboxHandled.athleteId, athleteId)),
    );
};
