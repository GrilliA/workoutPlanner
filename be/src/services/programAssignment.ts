import { and, asc, eq, inArray, ne, type SQL } from "drizzle-orm";
import { db } from "../db";
import {
  exercises,
  exerciseSets,
  programAssignments,
  workoutDays,
  workoutDayWeekdays,
  workouts,
} from "../db/schema";
import {
  computeAssignmentStatus,
  isActiveForStatus,
  planAssignmentCutover,
  todayInRome,
  type AssignmentDatesInput,
} from "./assignmentStatus";
import {
  saveWorkoutProgram,
  type WorkoutProgramInput,
} from "./workoutProgram";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const setWorkoutActive = async (
  tx: Tx,
  workoutId: number,
  isActive: boolean,
) => {
  await tx.update(workouts).set({ isActive }).where(eq(workouts.id, workoutId));
};

const applyAssignmentCutover = async (
  tx: Tx,
  coachId: number,
  athleteId: number,
  incoming: AssignmentDatesInput,
  keepWorkoutId?: number,
) => {
  const rows = await tx
    .select()
    .from(programAssignments)
    .where(eq(programAssignments.athleteId, athleteId))
    .for("update");

  const today = todayInRome();
  const candidates = rows.filter((row) => {
    if (row.coachId !== coachId) {
      return false;
    }

    if (row.status === "revoked") {
      return false;
    }

    if (keepWorkoutId && row.workoutId === keepWorkoutId) {
      return false;
    }

    return true;
  });

  const plan = planAssignmentCutover({
    rows: candidates.map((row) => ({
      id: row.id,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt,
    })),
    incoming,
    today,
  });

  const now = new Date();
  const byId = new Map(candidates.map((row) => [row.id, row]));

  if (plan.revokeIds.length > 0) {
    await tx
      .update(programAssignments)
      .set({ status: "revoked", updatedAt: now })
      .where(inArray(programAssignments.id, plan.revokeIds));

    for (const id of plan.revokeIds) {
      const row = byId.get(id);
      if (row) {
        await setWorkoutActive(tx, row.workoutId, false);
      }
    }
  }

  for (const item of plan.truncate) {
    const row = byId.get(item.id);
    if (!row) {
      continue;
    }

    const status = computeAssignmentStatus(row.startsAt, item.expiresAt, today);
    await tx
      .update(programAssignments)
      .set({ expiresAt: item.expiresAt, status, updatedAt: now })
      .where(eq(programAssignments.id, item.id));

    await setWorkoutActive(tx, row.workoutId, isActiveForStatus(status));
  }
};

/** Refresh derived status + workouts.isActive for non-revoked rows matching the filter. */
const syncAssignmentStatuses = async (
  filter: SQL,
  now = new Date(),
) => {
  const today = todayInRome(now);

  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(programAssignments)
      .where(and(filter, ne(programAssignments.status, "revoked")));

    for (const row of rows) {
      const next = computeAssignmentStatus(row.startsAt, row.expiresAt, today);
      if (next !== row.status) {
        await tx
          .update(programAssignments)
          .set({ status: next, updatedAt: now })
          .where(eq(programAssignments.id, row.id));
      }

      await setWorkoutActive(tx, row.workoutId, isActiveForStatus(next));
    }
  });
};

export const syncAssignmentStatusesForAthlete = (
  athleteId: number,
  now = new Date(),
) => syncAssignmentStatuses(eq(programAssignments.athleteId, athleteId), now);

export const syncAssignmentStatusesForCoach = (
  coachId: number,
  now = new Date(),
) => syncAssignmentStatuses(eq(programAssignments.coachId, coachId), now);

const copyWorkoutTree = async (
  tx: Tx,
  sourceWorkoutId: number,
  target: {
    userId: number;
    createdByUserId: number;
    sourceTemplateId: number | null;
    kind: "template" | "program";
    name?: string;
    isActive: boolean;
  },
) => {
  const [source] = await tx
    .select()
    .from(workouts)
    .where(eq(workouts.id, sourceWorkoutId));

  if (!source) {
    return null;
  }

  const [created] = await tx
    .insert(workouts)
    .values({
      userId: target.userId,
      createdByUserId: target.createdByUserId,
      sourceTemplateId: target.sourceTemplateId,
      kind: target.kind,
      name: target.name ?? source.name,
      defaultRestSec: source.defaultRestSec,
      workoutType: source.workoutType,
      frequency: source.frequency,
      isActive: target.isActive,
    })
    .returning();

  const days = await tx
    .select()
    .from(workoutDays)
    .where(eq(workoutDays.workoutId, sourceWorkoutId))
    .orderBy(asc(workoutDays.sortOrder), asc(workoutDays.id));

  for (const day of days) {
    const [newDay] = await tx
      .insert(workoutDays)
      .values({
        workoutId: created.id,
        name: day.name,
        sortOrder: day.sortOrder,
      })
      .returning();

    const weekdays = await tx
      .select()
      .from(workoutDayWeekdays)
      .where(eq(workoutDayWeekdays.workoutDayId, day.id));

    if (weekdays.length > 0) {
      await tx.insert(workoutDayWeekdays).values(
        weekdays.map((weekday) => ({
          workoutDayId: newDay.id,
          weekday: weekday.weekday,
        })),
      );
    }

    const dayExercises = await tx
      .select()
      .from(exercises)
      .where(eq(exercises.workoutDayId, day.id));

    for (const exercise of dayExercises) {
      const [newExercise] = await tx
        .insert(exercises)
        .values({
          workoutId: created.id,
          workoutDayId: newDay.id,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          catalogId: exercise.catalogId,
        })
        .returning();

      const sets = await tx
        .select()
        .from(exerciseSets)
        .where(eq(exerciseSets.exerciseId, exercise.id));

      if (sets.length > 0) {
        await tx.insert(exerciseSets).values(
          sets.map((set) => ({
            exerciseId: newExercise.id,
            setNumber: set.setNumber,
            reps: set.reps,
            restSec: set.restSec,
          })),
        );
      }
    }
  }

  return created;
};

export type AssignProgramResult =
  | {
      ok: true;
      assignment: typeof programAssignments.$inferSelect;
      workout: typeof workouts.$inferSelect;
    }
  | { ok: false; status: 400 | 404; error: string };

export const assignFromTemplate = async (
  coachId: number,
  athleteId: number,
  templateId: number,
  dates: AssignmentDatesInput,
): Promise<AssignProgramResult> => {
  const result = await db.transaction(async (tx) => {
    const [template] = await tx
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.id, templateId),
          eq(workouts.userId, coachId),
          eq(workouts.kind, "template"),
        ),
      );

    if (!template) {
      return { ok: false as const, status: 404 as const, error: "Template not found" };
    }

    const status = computeAssignmentStatus(dates.startsAt, dates.expiresAt);
    const workout = await copyWorkoutTree(tx, template.id, {
      userId: athleteId,
      createdByUserId: coachId,
      sourceTemplateId: template.id,
      kind: "program",
      isActive: isActiveForStatus(status),
    });

    if (!workout) {
      return { ok: false, status: 404, error: "Template not found" };
    }

    await applyAssignmentCutover(tx, coachId, athleteId, dates, workout.id);

    const [assignment] = await tx
      .insert(programAssignments)
      .values({
        workoutId: workout.id,
        coachId,
        athleteId,
        startsAt: dates.startsAt,
        expiresAt: dates.expiresAt,
        status,
      })
      .returning();

    return { ok: true, assignment, workout };
  });

  return result as AssignProgramResult;
};

export const assignBlankProgram = async (
  coachId: number,
  athleteId: number,
  dates: AssignmentDatesInput,
  name = "Nuova scheda",
): Promise<AssignProgramResult> => {
  const result = await db.transaction(async (tx) => {
    const status = computeAssignmentStatus(dates.startsAt, dates.expiresAt);

    const [workout] = await tx
      .insert(workouts)
      .values({
        userId: athleteId,
        createdByUserId: coachId,
        kind: "program",
        name,
        isActive: isActiveForStatus(status),
      })
      .returning();

    await tx.insert(workoutDays).values({
      workoutId: workout.id,
      name: "Giorno 1",
      sortOrder: 0,
    });

    await applyAssignmentCutover(tx, coachId, athleteId, dates, workout.id);

    const [assignment] = await tx
      .insert(programAssignments)
      .values({
        workoutId: workout.id,
        coachId,
        athleteId,
        startsAt: dates.startsAt,
        expiresAt: dates.expiresAt,
        status,
      })
      .returning();

    return { ok: true, assignment, workout };
  });

  return result as AssignProgramResult;
};

export const assignFromProgramInput = async (
  coachId: number,
  athleteId: number,
  dates: AssignmentDatesInput,
  program: WorkoutProgramInput,
): Promise<AssignProgramResult> => {
  const result = await db.transaction(async (tx) => {
    const status = computeAssignmentStatus(dates.startsAt, dates.expiresAt);

    const saved = await saveWorkoutProgram(
      athleteId,
      program,
      undefined,
      {
        kind: "program",
        createdByUserId: coachId,
        isActive: isActiveForStatus(status),
      },
      tx,
    );

    if (!saved.ok) {
      return { ok: false, status: saved.status, error: saved.error };
    }

    await applyAssignmentCutover(tx, coachId, athleteId, dates, saved.workout.id);

    const [assignment] = await tx
      .insert(programAssignments)
      .values({
        workoutId: saved.workout.id,
        coachId,
        athleteId,
        startsAt: dates.startsAt,
        expiresAt: dates.expiresAt,
        status,
      })
      .returning();

    return { ok: true, assignment, workout: saved.workout };
  });

  return result as AssignProgramResult;
};

export type UpdateAssignmentResult =
  | typeof programAssignments.$inferSelect
  | { ok: false; status: 400; error: string }
  | null;

export const updateAssignmentDates = async (
  coachId: number,
  assignmentId: number,
  dates: AssignmentDatesInput,
): Promise<UpdateAssignmentResult> => {
  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(programAssignments)
      .where(
        and(
          eq(programAssignments.id, assignmentId),
          eq(programAssignments.coachId, coachId),
        ),
      )
      .for("update");

    if (!row) {
      return null;
    }

    if (row.status === "revoked") {
      return { ok: false, status: 400, error: "Cannot update revoked assignment" };
    }

    const today = todayInRome();
    const status = computeAssignmentStatus(
      dates.startsAt,
      dates.expiresAt,
      today,
    );

    const [updated] = await tx
      .update(programAssignments)
      .set({
        startsAt: dates.startsAt,
        expiresAt: dates.expiresAt,
        status,
        updatedAt: new Date(),
      })
      .where(eq(programAssignments.id, assignmentId))
      .returning();

    await setWorkoutActive(tx, row.workoutId, isActiveForStatus(status));
    await applyAssignmentCutover(tx, coachId, row.athleteId, dates, row.workoutId);

    return updated;
  });

  return result as UpdateAssignmentResult;
};

export const revokeAssignment = async (
  coachId: number,
  assignmentId: number,
) => {
  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(programAssignments)
      .where(
        and(
          eq(programAssignments.id, assignmentId),
          eq(programAssignments.coachId, coachId),
        ),
      )
      .for("update");

    if (!row) {
      return null;
    }

    const [updated] = await tx
      .update(programAssignments)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(eq(programAssignments.id, assignmentId))
      .returning();

    await setWorkoutActive(tx, row.workoutId, false);

    return updated;
  });

  return result;
};

/** Either side of an assignment can cancel it. */
export const revokeAssignmentForParticipant = async (
  userId: number,
  assignmentId: number,
) => {
  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(programAssignments)
      .where(eq(programAssignments.id, assignmentId))
      .for("update");

    if (!row || (row.coachId !== userId && row.athleteId !== userId)) {
      return null;
    }

    const [updated] = await tx
      .update(programAssignments)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(eq(programAssignments.id, assignmentId))
      .returning();

    await setWorkoutActive(tx, row.workoutId, false);

    return updated;
  });

  return result;
};

export const coachOwnsAthleteProgram = async (
  coachId: number,
  athleteId: number,
  workoutId: number,
): Promise<boolean> => {
  const [program] = await db
    .select({
      id: workouts.id,
      createdByUserId: workouts.createdByUserId,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, athleteId),
        eq(workouts.kind, "program"),
      ),
    );

  if (!program) {
    return false;
  }

  if (program.createdByUserId === coachId) {
    return true;
  }

  const [assignment] = await db
    .select({ id: programAssignments.id })
    .from(programAssignments)
    .where(
      and(
        eq(programAssignments.workoutId, workoutId),
        eq(programAssignments.coachId, coachId),
        eq(programAssignments.athleteId, athleteId),
      ),
    )
    .limit(1);

  return Boolean(assignment);
};
