import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  exercises,
  workoutDayWeekdays,
  workoutDays,
  workoutScheduleOverrides,
  workouts,
} from "../db/schema";
import { enrichExercises } from "./exerciseAccess";
import { getRomeWeekday, toRomeDateKey, type Weekday } from "./workoutSchedule";

export type WorkoutDayRow = typeof workoutDays.$inferSelect;

type WeekdayRow = {
  workoutDayId: number;
  weekday: number;
};

type ExerciseCountRow = {
  workoutDayId: number | null;
};

type WeekdaysByDay = {
  workoutDayId: number;
  weekdays: Weekday[];
};

type ExerciseCountByDay = {
  workoutDayId: number;
  count: number;
};

const sortWeekdays = (weekdays: Weekday[]): Weekday[] =>
  [...weekdays].sort((a, b) => a - b);

const groupWeekdaysByDayId = (rows: WeekdayRow[]): WeekdaysByDay[] =>
  Object.entries(
    rows.reduce<Record<number, Weekday[]>>(
      (groups, row) => ({
        ...groups,
        [row.workoutDayId]: [
          ...(groups[row.workoutDayId] ?? []),
          row.weekday as Weekday,
        ],
      }),
      {},
    ),
  ).map(([workoutDayId, weekdays]) => ({
    workoutDayId: Number(workoutDayId),
    weekdays: sortWeekdays(weekdays),
  }));

const countExercisesByDayId = (rows: ExerciseCountRow[]): ExerciseCountByDay[] =>
  Object.entries(
    rows.reduce<Record<number, number>>((counts, row) => {
      if (row.workoutDayId === null) {
        return counts;
      }

      return {
        ...counts,
        [row.workoutDayId]: (counts[row.workoutDayId] ?? 0) + 1,
      };
    }, {}),
  ).map(([workoutDayId, count]) => ({
    workoutDayId: Number(workoutDayId),
    count,
  }));

const findWeekdaysForDay = (
  groups: WeekdaysByDay[],
  workoutDayId: number,
): Weekday[] =>
  groups.find((group) => group.workoutDayId === workoutDayId)?.weekdays ?? [];

const findExerciseCountForDay = (
  groups: ExerciseCountByDay[],
  workoutDayId: number,
): number =>
  groups.find((group) => group.workoutDayId === workoutDayId)?.count ?? 0;

export async function findWorkoutDayForUser(
  workoutDayId: number,
  userId: number,
): Promise<WorkoutDayRow | null> {
  const [row] = await db
    .select({
      id: workoutDays.id,
      workoutId: workoutDays.workoutId,
      name: workoutDays.name,
      sortOrder: workoutDays.sortOrder,
    })
    .from(workoutDays)
    .innerJoin(workouts, eq(workoutDays.workoutId, workouts.id))
    .where(and(eq(workoutDays.id, workoutDayId), eq(workouts.userId, userId)));

  return row ?? null;
}

export async function listWorkoutDaysForWorkout(
  workoutId: number,
): Promise<WorkoutDayRow[]> {
  return db
    .select()
    .from(workoutDays)
    .where(eq(workoutDays.workoutId, workoutId))
    .orderBy(asc(workoutDays.sortOrder), asc(workoutDays.id));
}

export async function listEnrichedWorkoutDays(workoutId: number) {
  const days = await listWorkoutDaysForWorkout(workoutId);
  const dayIds = days.map((day) => day.id);

  if (dayIds.length === 0) {
    return [];
  }

  const weekdayRows = await db
    .select({
      workoutDayId: workoutDayWeekdays.workoutDayId,
      weekday: workoutDayWeekdays.weekday,
    })
    .from(workoutDayWeekdays)
    .where(inArray(workoutDayWeekdays.workoutDayId, dayIds));

  const exerciseRows = await db
    .select({
      workoutDayId: exercises.workoutDayId,
    })
    .from(exercises)
    .where(inArray(exercises.workoutDayId, dayIds));

  const weekdaysByDay = groupWeekdaysByDayId(weekdayRows);
  const exerciseCountsByDay = countExercisesByDayId(exerciseRows);

  return days.map((day) => ({
    ...day,
    weekdays: findWeekdaysForDay(weekdaysByDay, day.id),
    exerciseCount: findExerciseCountForDay(exerciseCountsByDay, day.id),
  }));
}

export async function listProgramDaysWithExercises(workoutId: number) {
  const days = await listEnrichedWorkoutDays(workoutId);

  return Promise.all(
    days.map(async (day) => {
      const rows = await db
        .select()
        .from(exercises)
        .where(eq(exercises.workoutDayId, day.id));
      const enriched = await enrichExercises(rows);

      return {
        ...day,
        exercises: enriched,
      };
    }),
  );
}

export type ResolvedWorkoutDay = {
  workoutDayId: number;
  workoutDayName: string;
  source: "override" | "schedule" | "default";
};

export async function resolveWorkoutDayForDate(
  workoutId: number,
  userId: number,
  date: Date = new Date(),
): Promise<ResolvedWorkoutDay | null> {
  const dateKey = toRomeDateKey(date);

  const [override] = await db
    .select({
      workoutDayId: workoutScheduleOverrides.workoutDayId,
      workoutDayName: workoutDays.name,
    })
    .from(workoutScheduleOverrides)
    .innerJoin(workoutDays, eq(workoutScheduleOverrides.workoutDayId, workoutDays.id))
    .where(
      and(
        eq(workoutScheduleOverrides.userId, userId),
        eq(workoutScheduleOverrides.workoutId, workoutId),
        eq(workoutScheduleOverrides.scheduledDate, dateKey),
      ),
    );

  if (override) {
    return {
      workoutDayId: override.workoutDayId,
      workoutDayName: override.workoutDayName,
      source: "override",
    };
  }

  const weekday = getRomeWeekday(date);

  const [scheduled] = await db
    .select({
      workoutDayId: workoutDays.id,
      workoutDayName: workoutDays.name,
    })
    .from(workoutDayWeekdays)
    .innerJoin(workoutDays, eq(workoutDayWeekdays.workoutDayId, workoutDays.id))
    .where(
      and(eq(workoutDays.workoutId, workoutId), eq(workoutDayWeekdays.weekday, weekday)),
    )
    .orderBy(asc(workoutDays.sortOrder), asc(workoutDays.id))
    .limit(1);

  if (!scheduled) {
    const days = await listWorkoutDaysForWorkout(workoutId);

    if (days.length === 1) {
      return {
        workoutDayId: days[0].id,
        workoutDayName: days[0].name,
        source: "default",
      };
    }

    return null;
  }

  return {
    workoutDayId: scheduled.workoutDayId,
    workoutDayName: scheduled.workoutDayName,
    source: "schedule",
  };
}

export async function ensureDefaultWorkoutDay(
  workoutId: number,
  name = "Giorno 1",
): Promise<WorkoutDayRow> {
  const existing = await listWorkoutDaysForWorkout(workoutId);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(workoutDays)
    .values({ workoutId, name, sortOrder: 0 })
    .returning();

  return created;
}

export async function replaceWeekdaysForDay(
  workoutDayId: number,
  weekdays: Weekday[],
): Promise<void> {
  await db.delete(workoutDayWeekdays).where(eq(workoutDayWeekdays.workoutDayId, workoutDayId));

  if (weekdays.length === 0) {
    return;
  }

  await db.insert(workoutDayWeekdays).values(
    weekdays.map((weekday) => ({
      workoutDayId,
      weekday,
    })),
  );
}

export async function findTakenWeekdaysForWorkout(
  workoutId: number,
  excludeDayId?: number,
): Promise<Weekday[]> {
  const rows = await db
    .select({
      workoutDayId: workoutDayWeekdays.workoutDayId,
      weekday: workoutDayWeekdays.weekday,
    })
    .from(workoutDayWeekdays)
    .innerJoin(workoutDays, eq(workoutDayWeekdays.workoutDayId, workoutDays.id))
    .where(eq(workoutDays.workoutId, workoutId));

  return rows
    .filter((row) => row.workoutDayId !== excludeDayId)
    .map((row) => row.weekday as Weekday);
}

export function findWeekdayConflict(
  weekdays: Weekday[],
  taken: Weekday[],
): Weekday | undefined {
  return weekdays.find((weekday) => taken.includes(weekday));
}

export async function upsertScheduleOverride(
  userId: number,
  workoutId: number,
  scheduledDate: string,
  workoutDayId: number,
): Promise<void> {
  await db
    .insert(workoutScheduleOverrides)
    .values({
      userId,
      workoutId,
      scheduledDate,
      workoutDayId,
    })
    .onConflictDoUpdate({
      target: [
        workoutScheduleOverrides.userId,
        workoutScheduleOverrides.workoutId,
        workoutScheduleOverrides.scheduledDate,
      ],
      set: { workoutDayId },
    });
}

export async function deleteScheduleOverride(
  userId: number,
  workoutId: number,
  scheduledDate: string,
): Promise<boolean> {
  const deleted = await db
    .delete(workoutScheduleOverrides)
    .where(
      and(
        eq(workoutScheduleOverrides.userId, userId),
        eq(workoutScheduleOverrides.workoutId, workoutId),
        eq(workoutScheduleOverrides.scheduledDate, scheduledDate),
      ),
    )
    .returning({ id: workoutScheduleOverrides.id });

  return deleted.length > 0;
}
