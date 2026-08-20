type LoggedSetRow = {
  weightKg: number | null;
  reps: number;
};

export type { LoggedSetRow };

export type RecentSessionSummary = {
  sessionId: number;
  workoutId: number;
  workoutName: string;
  completedAt: Date;
  durationMin: number;
  volumeKg: number;
};

export type DailyStatPoint = {
  date: string;
  weekdayLabel: string;
  volumeKg: number;
  workoutCount: number;
};

export type StatsPeriod = {
  from: Date;
  to: Date;
};

export type UserStats = {
  period: StatsPeriod;
  volumeKg: number;
  workoutsPerWeek: number;
  streakDays: number;
  recordVolumeKg: number;
  totalSessions: number;
  averageSessionVolumeKg: number;
  dailyBreakdown: DailyStatPoint[];
  recentSessions: RecentSessionSummary[];
};

const ROME_TIME_ZONE = "Europe/Rome";
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const DEFAULT_RECENT_LIMIT = 5;
const MAX_RECENT_LIMIT = 20;
const ROLLING_WINDOW_DAYS = 7;

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"] as const;

const getWeekdayLabel = (dateKey: string): string => {
  const date = new Date(`${dateKey}T12:00:00`);
  const weekdayLabel = date.toLocaleDateString("en-US", {
    timeZone: ROME_TIME_ZONE,
    weekday: "short",
  });
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const weekday = map[weekdayLabel] ?? 0;
  return WEEKDAY_LABELS[weekday];
};

const buildDailyBreakdown = (
  sessions: { completedAt: Date; volumeKg: number }[],
  now: Date,
  days = ROLLING_WINDOW_DAYS,
): DailyStatPoint[] => {
  const todayKey = toRomeDateKey(now);
  const dateKeys = Array.from({ length: days }, (_, index) =>
    addRomeDays(todayKey, -(days - 1 - index)),
  );

  const totals = sessions.reduce<Record<string, { volumeKg: number; workoutCount: number }>>(
    (groups, session) => {
      const dateKey = toRomeDateKey(session.completedAt);
      const existing = groups[dateKey] ?? { volumeKg: 0, workoutCount: 0 };

      return {
        ...groups,
        [dateKey]: {
          volumeKg: existing.volumeKg + session.volumeKg,
          workoutCount: existing.workoutCount + 1,
        },
      };
    },
    {},
  );

  return dateKeys.map((date) => ({
    date,
    weekdayLabel: getWeekdayLabel(date),
    volumeKg: totals[date]?.volumeKg ?? 0,
    workoutCount: totals[date]?.workoutCount ?? 0,
  }));
};

export const parseRecentLimit = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_RECENT_LIMIT;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_RECENT_LIMIT;
  }

  return Math.min(parsed, MAX_RECENT_LIMIT);
};

export const computeSessionVolumeKg = (sets: LoggedSetRow[]): number =>
  sets.reduce((total, set) => {
    if (set.weightKg === null || set.weightKg <= 0) {
      return total;
    }

    return total + set.weightKg * set.reps;
  }, 0);

export const computeSessionDurationMin = (
  startedAt: Date,
  completedAt: Date | null,
): number => {
  if (!completedAt) {
    return 0;
  }

  const elapsedMs = completedAt.getTime() - startedAt.getTime();

  if (elapsedMs <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(elapsedMs / MS_PER_MINUTE));
};

export const toRomeDateKey = (date: Date): string =>
  date.toLocaleDateString("en-CA", { timeZone: ROME_TIME_ZONE });

export const addRomeDays = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return utcDate.toISOString().slice(0, 10);
};

export const computeStreakDays = (completedAts: Date[], now: Date = new Date()): number => {
  const uniqueDays = [...new Set(completedAts.map(toRomeDateKey))].sort((a, b) =>
    b.localeCompare(a),
  );

  if (uniqueDays.length === 0) {
    return 0;
  }

  const todayKey = toRomeDateKey(now);
  const yesterdayKey = addRomeDays(todayKey, -1);
  const latestDay = uniqueDays[0];

  if (latestDay !== todayKey && latestDay !== yesterdayKey) {
    return 0;
  }

  const breakIndex = uniqueDays.findIndex(
    (day, index) => day !== addRomeDays(latestDay, -index),
  );

  return breakIndex === -1 ? uniqueDays.length : breakIndex;
};

export const isWithinRollingWindow = (
  completedAt: Date,
  windowEnd: Date,
  windowDays: number,
): boolean => {
  const windowStart = new Date(windowEnd.getTime() - windowDays * MS_PER_DAY);
  return completedAt >= windowStart && completedAt <= windowEnd;
};

type CompletedSessionRow = {
  sessionId: number;
  workoutId: number;
  workoutName: string;
  startedAt: Date;
  completedAt: Date;
};

export type SessionSetsGroup = {
  sessionId: number;
  sets: LoggedSetRow[];
};

export const groupLoggedSetsBySession = (
  sets: { sessionId: number; weightKg: number | null; reps: number }[],
): SessionSetsGroup[] =>
  Object.entries(
    sets.reduce<Record<number, LoggedSetRow[]>>(
      (groups, set) => ({
        ...groups,
        [set.sessionId]: [
          ...(groups[set.sessionId] ?? []),
          { weightKg: set.weightKg, reps: set.reps },
        ],
      }),
      {},
    ),
  ).map(([sessionId, sessionSets]) => ({
    sessionId: Number(sessionId),
    sets: sessionSets,
  }));

const findSessionSets = (
  groups: SessionSetsGroup[],
  sessionId: number,
): LoggedSetRow[] =>
  groups.find((group) => group.sessionId === sessionId)?.sets ?? [];

export const buildUserStats = (
  sessions: CompletedSessionRow[],
  setsBySession: SessionSetsGroup[],
  recentLimit: number,
  now: Date = new Date(),
): UserStats => {
  const period = {
    from: new Date(now.getTime() - ROLLING_WINDOW_DAYS * MS_PER_DAY),
    to: now,
  };

  const enriched = sessions.map((session) => {
    const sets = findSessionSets(setsBySession, session.sessionId);
    const volumeKg = computeSessionVolumeKg(sets);

    return {
      ...session,
      volumeKg,
      durationMin: computeSessionDurationMin(session.startedAt, session.completedAt),
    };
  });

  const weeklySessions = enriched.filter((session) =>
    isWithinRollingWindow(session.completedAt, now, ROLLING_WINDOW_DAYS),
  );

  const volumeKg = weeklySessions.reduce((total, session) => total + session.volumeKg, 0);
  const recordVolumeKg = enriched.reduce(
    (max, session) => Math.max(max, session.volumeKg),
    0,
  );

  const recentSessions = [...enriched]
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, recentLimit)
    .map((session) => ({
      sessionId: session.sessionId,
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      completedAt: session.completedAt,
      durationMin: session.durationMin,
      volumeKg: session.volumeKg,
    }));

  const totalVolumeKg = enriched.reduce((total, session) => total + session.volumeKg, 0);

  return {
    period,
    volumeKg,
    workoutsPerWeek: weeklySessions.length,
    streakDays: computeStreakDays(
      sessions.map((session) => session.completedAt),
      now,
    ),
    recordVolumeKg,
    totalSessions: enriched.length,
    averageSessionVolumeKg:
      enriched.length > 0 ? Math.round(totalVolumeKg / enriched.length) : 0,
    dailyBreakdown: buildDailyBreakdown(enriched, now),
    recentSessions,
  };
};
