import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { loggedSets, workoutDays, workoutSessions, workouts } from "../db/schema";
import { getActiveAssignmentForAthlete } from "./coachDashboard";
import { getAthleteCoach } from "./coachInvite";
import {
  ROLLING_WINDOW_DAYS,
  computeSessionVolumeKg,
  groupLoggedSetsBySession,
  isWithinRollingWindow,
} from "./stats";
import {
  listEnrichedWorkoutDays,
  resolveWorkoutDayForDate,
  resolveWorkoutDaysForWeek,
} from "./workoutDayAccess";
import {
  addDaysToDateKey,
  getRomeWeekday,
  toRomeDateKey,
  type ResolvedWorkoutDay,
  type Weekday,
} from "./workoutSchedule";

const MS_PER_DAY = 86_400_000;

export type NoProgramReason = "no-coach" | "coach-pending" | "coach-program-inactive";

export type AthleteHomeWorkout = {
  id: number;
  name: string;
  isActive: boolean;
  createdByUserId: number | null;
  createdAt: Date;
};

export type AthleteHomeAssignment = {
  workoutId: number;
  expiresAt: string;
  seenAt: Date | null;
};

export type AthleteHomeDay = {
  id: number;
  name: string;
  weekdays: number[];
  exerciseCount: number;
};

type ScheduleEntry = {
  date: string;
  weekday: Weekday;
  resolved: ResolvedWorkoutDay | null;
};

export type AthleteHomeSchedule = {
  workoutId: number;
  today: ResolvedWorkoutDay | null;
  week: ScheduleEntry[];
  nextDays: ScheduleEntry[];
};

export type AthleteHomeSession = {
  sessionId: number;
  workoutDayName: string | null;
  completedAt: Date;
  volumeKg: number;
};

export type AthleteHomeInput = {
  userId: number;
  now: Date;
  todayKey: string;
  weekStartKey: string;
  workouts: AthleteHomeWorkout[];
  activeAssignment: AthleteHomeAssignment | null;
  hasLinkedCoach: boolean;
  daysByWorkout: { workoutId: number; days: AthleteHomeDay[] }[];
  schedules: AthleteHomeSchedule[];
  completedSessions: AthleteHomeSession[];
};

export type AthleteHome = {
  noProgramReason: NoProgramReason | null;
  programs: {
    workoutId: number;
    name: string;
    source: "coach" | "self";
    expiresAt: string | null;
    days: AthleteHomeDay[];
  }[];
  today: {
    date: string;
    workoutId: number;
    workoutDayId: number;
    workoutDayName: string;
  } | null;
  week: {
    date: string;
    weekday: number;
    workoutDayId: number | null;
    workoutDayName: string | null;
  }[];
  nextWorkout: { date: string; workoutDayName: string } | null;
  sessionsLast7Days: number;
  lastSession: {
    sessionId: number;
    workoutDayName: string | null;
    completedAt: string;
    volumeKg: number;
  } | null;
  hasUnseenAssignment: boolean;
};

export const selectHomePrograms = <T extends AthleteHomeWorkout>(
  userWorkouts: T[],
  activeAssignmentWorkoutId: number | null,
  userId: number,
): T[] =>
  (activeAssignmentWorkoutId !== null
    ? userWorkouts.filter((workout) => workout.id === activeAssignmentWorkoutId)
    : userWorkouts.filter(
        (workout) =>
          workout.isActive &&
          (workout.createdByUserId == null || workout.createdByUserId === userId),
      )
  ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

const resolveNoProgramReason = (
  hasLinkedCoach: boolean,
  userWorkouts: Pick<AthleteHomeWorkout, "createdByUserId">[],
  userId: number,
): NoProgramReason => {
  if (!hasLinkedCoach) {
    return "no-coach";
  }

  const hasCoachProgram = userWorkouts.some(
    (workout) => workout.createdByUserId != null && workout.createdByUserId !== userId,
  );

  return hasCoachProgram ? "coach-program-inactive" : "coach-pending";
};

const findScheduleEntry = (
  schedule: AthleteHomeSchedule | undefined,
  entries: "week" | "nextDays",
  date: string,
): ResolvedWorkoutDay | null =>
  schedule?.[entries].find((entry) => entry.date === date)?.resolved ?? null;

export const buildAthleteHome = (input: AthleteHomeInput): AthleteHome => {
  const programs = selectHomePrograms(
    input.workouts,
    input.activeAssignment?.workoutId ?? null,
    input.userId,
  );
  const schedules = programs.map((program) =>
    input.schedules.find((schedule) => schedule.workoutId === program.id),
  );

  const todayIndex = schedules.findIndex((schedule) => schedule?.today);
  const todaySchedule = todayIndex === -1 ? undefined : schedules[todayIndex];
  const today =
    todaySchedule?.today
      ? {
          date: input.todayKey,
          workoutId: todaySchedule.workoutId,
          workoutDayId: todaySchedule.today.workoutDayId,
          workoutDayName: todaySchedule.today.workoutDayName,
        }
      : null;

  const weekSchedule = todaySchedule ?? schedules[0];
  const week = Array.from({ length: 7 }, (_, weekday) => {
    const date = addDaysToDateKey(input.weekStartKey, weekday);
    const resolved = findScheduleEntry(weekSchedule, "week", date);

    return {
      date,
      weekday,
      workoutDayId: resolved?.workoutDayId ?? null,
      workoutDayName: resolved?.workoutDayName ?? null,
    };
  });

  const nextWorkout = today
    ? null
    : (Array.from({ length: 7 }, (_, index) => addDaysToDateKey(input.todayKey, index + 1))
        .flatMap((date) =>
          schedules.flatMap((schedule) => {
            const resolved = findScheduleEntry(schedule, "nextDays", date);
            return resolved ? [{ date, workoutDayName: resolved.workoutDayName }] : [];
          }),
        )[0] ?? null);

  const sessionsLast7Days = input.completedSessions.filter((session) =>
    isWithinRollingWindow(session.completedAt, input.now, ROLLING_WINDOW_DAYS),
  ).length;

  const [latest] = [...input.completedSessions].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime() || b.sessionId - a.sessionId,
  );

  return {
    noProgramReason:
      programs.length === 0
        ? resolveNoProgramReason(input.hasLinkedCoach, input.workouts, input.userId)
        : null,
    programs: programs.map((program) => ({
      workoutId: program.id,
      name: program.name,
      source: input.activeAssignment ? "coach" : "self",
      expiresAt: input.activeAssignment?.expiresAt ?? null,
      days: (
        input.daysByWorkout.find((entry) => entry.workoutId === program.id)?.days ?? []
      ).map((day) => ({
        id: day.id,
        name: day.name,
        weekdays: day.weekdays,
        exerciseCount: day.exerciseCount,
      })),
    })),
    today,
    week,
    nextWorkout,
    sessionsLast7Days,
    lastSession: latest
      ? {
          sessionId: latest.sessionId,
          workoutDayName: latest.workoutDayName,
          completedAt: latest.completedAt.toISOString(),
          volumeKg: latest.volumeKg,
        }
      : null,
    hasUnseenAssignment: input.activeAssignment !== null && input.activeAssignment.seenAt === null,
  };
};

const loadRecentCompletedSessions = async (
  userId: number,
  now: Date,
): Promise<AthleteHomeSession[]> => {
  const completedForUser = and(
    eq(workoutSessions.userId, userId),
    eq(workoutSessions.status, "completed"),
    isNotNull(workoutSessions.completedAt),
  );
  const columns = {
    sessionId: workoutSessions.id,
    workoutDayName: workoutDays.name,
    completedAt: workoutSessions.completedAt,
  };
  const windowStart = new Date(now.getTime() - ROLLING_WINDOW_DAYS * MS_PER_DAY);

  const [inWindow, latest] = await Promise.all([
    db
      .select(columns)
      .from(workoutSessions)
      .leftJoin(workoutDays, eq(workoutSessions.workoutDayId, workoutDays.id))
      .where(and(completedForUser, gte(workoutSessions.completedAt, windowStart))),
    db
      .select(columns)
      .from(workoutSessions)
      .leftJoin(workoutDays, eq(workoutSessions.workoutDayId, workoutDays.id))
      .where(completedForUser)
      .orderBy(desc(workoutSessions.completedAt), desc(workoutSessions.id))
      .limit(1),
  ]);

  const sessions = [...inWindow, ...latest].filter(
    (session, index, all) =>
      all.findIndex((other) => other.sessionId === session.sessionId) === index,
  );
  const sessionIds = sessions.map((session) => session.sessionId);
  const setsBySession =
    sessionIds.length === 0
      ? []
      : groupLoggedSetsBySession(
          await db
            .select({
              sessionId: loggedSets.sessionId,
              weightKg: loggedSets.weightKg,
              reps: loggedSets.reps,
            })
            .from(loggedSets)
            .where(inArray(loggedSets.sessionId, sessionIds)),
        );

  return sessions.map((session) => ({
    sessionId: session.sessionId,
    workoutDayName: session.workoutDayName,
    completedAt: session.completedAt!,
    volumeKg: computeSessionVolumeKg(
      setsBySession.find((group) => group.sessionId === session.sessionId)?.sets ?? [],
    ),
  }));
};

export const loadAthleteHome = async (
  userId: number,
  now: Date = new Date(),
): Promise<AthleteHome> => {
  const todayKey = toRomeDateKey(now);
  const weekStartKey = addDaysToDateKey(todayKey, -getRomeWeekday(now));
  const nextDaysStartKey = addDaysToDateKey(todayKey, 1);

  const activeAssignment = await getActiveAssignmentForAthlete(userId);

  const [userWorkouts, coach, completedSessions] = await Promise.all([
    db
      .select({
        id: workouts.id,
        name: workouts.name,
        isActive: workouts.isActive,
        createdByUserId: workouts.createdByUserId,
        createdAt: workouts.createdAt,
      })
      .from(workouts)
      .where(eq(workouts.userId, userId)),
    getAthleteCoach(userId),
    loadRecentCompletedSessions(userId, now),
  ]);

  const programs = selectHomePrograms(
    userWorkouts,
    activeAssignment?.workoutId ?? null,
    userId,
  );

  const [daysByWorkout, schedules] = await Promise.all([
    Promise.all(
      programs.map(async (program) => ({
        workoutId: program.id,
        days: await listEnrichedWorkoutDays(program.id),
      })),
    ),
    Promise.all(
      programs.map(async (program) => {
        const [today, week, nextDays] = await Promise.all([
          resolveWorkoutDayForDate(program.id, userId, now),
          resolveWorkoutDaysForWeek(program.id, userId, weekStartKey),
          resolveWorkoutDaysForWeek(program.id, userId, nextDaysStartKey),
        ]);

        return { workoutId: program.id, today, week, nextDays };
      }),
    ),
  ]);

  return buildAthleteHome({
    userId,
    now,
    todayKey,
    weekStartKey,
    workouts: userWorkouts,
    activeAssignment,
    hasLinkedCoach: coach !== null,
    daysByWorkout,
    schedules,
    completedSessions,
  });
};
