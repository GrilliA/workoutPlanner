import {
  addRomeDays,
  computeSessionDurationMin,
  computeSessionVolumeKg,
  computeStreakDays,
  toRomeDateKey,
  type LoggedSetRow,
} from "./stats";

export const STATS_RANGES = ["4w", "12w", "52w"] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

const RANGE_WEEKS: Record<StatsRange, number> = {
  "4w": 4,
  "12w": 12,
  "52w": 52,
};

const MS_PER_DAY = 86_400_000;

/** Epley e1RM: weight × (1 + reps / 30). Valid only for weight > 0 and reps 1–12. */
export const computeE1RM = (weightKg: number | null, reps: number): number | null => {
  if (weightKg === null || weightKg <= 0) {
    return null;
  }

  if (!Number.isInteger(reps) || reps < 1 || reps > 12) {
    return null;
  }

  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
};

export const parseStatsRange = (value: unknown): StatsRange | null => {
  if (typeof value !== "string") {
    return null;
  }

  return STATS_RANGES.includes(value as StatsRange) ? (value as StatsRange) : null;
};

export type PeriodBounds = {
  from: string;
  to: string;
};

export type RangePeriods = {
  range: StatsRange;
  current: PeriodBounds;
  previous: PeriodBounds;
};

export const buildRangePeriods = (
  range: StatsRange,
  today = toRomeDateKey(new Date()),
): RangePeriods => {
  const weeks = RANGE_WEEKS[range];
  const days = weeks * 7 - 1;
  const currentFrom = addRomeDays(today, -days);

  const previousTo = addRomeDays(currentFrom, -1);
  const previousFrom = addRomeDays(previousTo, -days);

  return {
    range,
    current: { from: currentFrom, to: today },
    previous: { from: previousFrom, to: previousTo },
  };
};

export type CompletedSessionRow = {
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

export type SessionSetsWithExerciseGroup = {
  sessionId: number;
  sets: Array<LoggedSetRow & { exerciseId: number }>;
};

export type WeeklySeriesPoint = {
  weekStart: string;
  weekEnd: string;
  sessionCount: number;
  volumeKg: number;
};

export type ExerciseProgressionPoint = {
  date: string;
  sessionId: number;
  bestE1RM: number | null;
  bestWeightKg: number | null;
  totalReps: number;
};

export type ExerciseProgression = {
  exerciseId: number;
  exerciseName: string;
  points: ExerciseProgressionPoint[];
  prE1RM: number | null;
  prWeightKg: number | null;
};

export type AnalyticsSummary = {
  range: StatsRange;
  period: PeriodBounds;
  previousPeriod: PeriodBounds;
  sessionsCompleted: number;
  volumeKg: number;
  previousVolumeKg: number;
  volumeChangePct: number | null;
  streakDays: number;
  prCount: number;
  weeklySeries: WeeklySeriesPoint[];
};

export type CoachAlertType = "inactive" | "program_expiring";

export type CoachAlert = {
  type: CoachAlertType;
  severity: "high" | "medium";
  message: string;
  athleteId: number;
  athleteName: string | null;
};

const isDateInRange = (dateKey: string, period: PeriodBounds): boolean =>
  dateKey >= period.from && dateKey <= period.to;

const findSessionSets = (
  groups: SessionSetsGroup[],
  sessionId: number,
): LoggedSetRow[] => groups.find((group) => group.sessionId === sessionId)?.sets ?? [];

const findSessionSetsWithExercise = (
  groups: SessionSetsWithExerciseGroup[],
  sessionId: number,
): Array<LoggedSetRow & { exerciseId: number }> =>
  groups.find((group) => group.sessionId === sessionId)?.sets ?? [];

export const buildWeeklySeries = (
  sessions: CompletedSessionRow[],
  setsBySession: SessionSetsGroup[],
  period: PeriodBounds,
): WeeklySeriesPoint[] => {
  const weekStarts: string[] = [];
  let cursor = period.from;

  while (cursor <= period.to) {
    weekStarts.push(cursor);
    cursor = addRomeDays(cursor, 7);
  }

  return weekStarts.map((weekStart) => {
    const weekEnd = addRomeDays(weekStart, 6);
    const boundedEnd = weekEnd > period.to ? period.to : weekEnd;

    const weekSessions = sessions.filter((session) => {
      const dateKey = toRomeDateKey(session.completedAt);
      return dateKey >= weekStart && dateKey <= boundedEnd;
    });

    const volumeKg = weekSessions.reduce((total, session) => {
      const sets = findSessionSets(setsBySession, session.sessionId);
      return total + computeSessionVolumeKg(sets);
    }, 0);

    return {
      weekStart,
      weekEnd: boundedEnd,
      sessionCount: weekSessions.length,
      volumeKg,
    };
  });
};

export const buildExerciseProgressions = (
  sessions: CompletedSessionRow[],
  setsBySession: SessionSetsWithExerciseGroup[],
  exerciseNames: Map<number, string>,
  period: PeriodBounds,
): ExerciseProgression[] => {
  const byExercise = new Map<
    number,
    { name: string; points: ExerciseProgressionPoint[]; prE1RM: number | null; prWeightKg: number | null }
  >();

  for (const session of sessions) {
    const dateKey = toRomeDateKey(session.completedAt);

    if (!isDateInRange(dateKey, period)) {
      continue;
    }

    const sets = findSessionSetsWithExercise(setsBySession, session.sessionId);

    const grouped = sets.reduce<Map<number, Array<LoggedSetRow & { exerciseId: number }>>>(
      (groups, set) =>
        groups.set(set.exerciseId, [...(groups.get(set.exerciseId) ?? []), set]),
      new Map(),
    );

    for (const [exerciseId, exerciseSets] of grouped) {
      const e1rms = exerciseSets
        .map((set) => computeE1RM(set.weightKg, set.reps))
        .filter((value): value is number => value !== null);
      const weights = exerciseSets
        .map((set) => set.weightKg)
        .filter((value): value is number => value !== null && value > 0);

      const bestE1RM = e1rms.length > 0 ? Math.max(...e1rms) : null;
      const bestWeightKg = weights.length > 0 ? Math.max(...weights) : null;
      const totalReps = exerciseSets.reduce((sum, set) => sum + set.reps, 0);
      const name = exerciseNames.get(exerciseId) ?? `Esercizio ${exerciseId}`;

      const existing = byExercise.get(exerciseId) ?? {
        name,
        points: [],
        prE1RM: null,
        prWeightKg: null,
      };

      const point: ExerciseProgressionPoint = {
        date: dateKey,
        sessionId: session.sessionId,
        bestE1RM,
        bestWeightKg,
        totalReps,
      };

      byExercise.set(exerciseId, {
        name,
        points: [...existing.points, point],
        prE1RM:
          bestE1RM === null
            ? existing.prE1RM
            : existing.prE1RM === null
              ? bestE1RM
              : Math.max(existing.prE1RM, bestE1RM),
        prWeightKg:
          bestWeightKg === null
            ? existing.prWeightKg
            : existing.prWeightKg === null
              ? bestWeightKg
              : Math.max(existing.prWeightKg, bestWeightKg),
      });
    }
  }

  return [...byExercise.entries()]
    .map(([exerciseId, value]) => ({
      exerciseId,
      exerciseName: value.name,
      points: value.points.sort((a, b) => a.date.localeCompare(b.date)),
      prE1RM: value.prE1RM,
      prWeightKg: value.prWeightKg,
    }))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
};

export const countPersonalRecords = (
  sessions: CompletedSessionRow[],
  setsBySession: SessionSetsWithExerciseGroup[],
  period: PeriodBounds,
): number => {
  const bestE1RMByExercise = new Map<number, number>();
  let prCount = 0;

  const sorted = [...sessions].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime(),
  );

  for (const session of sorted) {
    const dateKey = toRomeDateKey(session.completedAt);
    const inPeriod = isDateInRange(dateKey, period);
    const sets = findSessionSetsWithExercise(setsBySession, session.sessionId);

    const byExercise = sets.reduce<Map<number, Array<LoggedSetRow & { exerciseId: number }>>>(
      (groups, set) =>
        groups.set(set.exerciseId, [...(groups.get(set.exerciseId) ?? []), set]),
      new Map(),
    );

    for (const [exerciseId, exerciseSets] of byExercise) {
      const sessionBest = Math.max(
        ...exerciseSets
          .map((set) => computeE1RM(set.weightKg, set.reps))
          .filter((value): value is number => value !== null),
        -Infinity,
      );

      if (!Number.isFinite(sessionBest)) {
        continue;
      }

      const previousBest = bestE1RMByExercise.get(exerciseId);

      if (previousBest === undefined) {
        bestE1RMByExercise.set(exerciseId, sessionBest);
        if (inPeriod) {
          prCount += 1;
        }
        continue;
      }

      if (sessionBest > previousBest) {
        bestE1RMByExercise.set(exerciseId, sessionBest);
        if (inPeriod) {
          prCount += 1;
        }
      }
    }
  }

  return prCount;
};

export type BuildAnalyticsInput = {
  range: StatsRange;
  sessions: CompletedSessionRow[];
  setsBySession: SessionSetsGroup[];
  setsBySessionWithExercise?: SessionSetsWithExerciseGroup[];
  now?: Date;
};

export const buildAnalyticsSummary = (input: BuildAnalyticsInput): AnalyticsSummary => {
  const now = input.now ?? new Date();
  const today = toRomeDateKey(now);
  const periods = buildRangePeriods(input.range, today);

  const setsForPr = input.setsBySessionWithExercise ?? [];

  const currentSessions = input.sessions.filter((session) =>
    isDateInRange(toRomeDateKey(session.completedAt), periods.current),
  );
  const previousSessions = input.sessions.filter((session) =>
    isDateInRange(toRomeDateKey(session.completedAt), periods.previous),
  );

  const currentVolume = currentSessions.reduce((total, session) => {
    const sets = findSessionSets(input.setsBySession, session.sessionId);
    return total + computeSessionVolumeKg(sets);
  }, 0);

  const previousVolume = previousSessions.reduce((total, session) => {
    const sets = findSessionSets(input.setsBySession, session.sessionId);
    return total + computeSessionVolumeKg(sets);
  }, 0);

  const volumeChangePct =
    previousVolume > 0
      ? Math.round(((currentVolume - previousVolume) / previousVolume) * 1000) / 10
      : null;

  const weeklySeries = buildWeeklySeries(
    input.sessions,
    input.setsBySession,
    periods.current,
  );

  return {
    range: input.range,
    period: periods.current,
    previousPeriod: periods.previous,
    sessionsCompleted: currentSessions.length,
    volumeKg: currentVolume,
    previousVolumeKg: previousVolume,
    volumeChangePct,
    streakDays: computeStreakDays(
      input.sessions.map((session) => session.completedAt),
      now,
    ),
    prCount:
      setsForPr.length > 0
        ? countPersonalRecords(input.sessions, setsForPr, periods.current)
        : 0,
    weeklySeries,
  };
};

export type CoachAlertInput = {
  athleteId: number;
  athleteName: string | null;
  lastSessionDate: string | null;
  programExpiresAt: string | null;
  today: string;
};

export const buildCoachAlerts = (input: CoachAlertInput): CoachAlert[] => {
  const alerts: CoachAlert[] = [];

  if (input.lastSessionDate !== null) {
    const daysSince =
      (Date.parse(`${input.today}T00:00:00Z`) -
        Date.parse(`${input.lastSessionDate}T00:00:00Z`)) /
      MS_PER_DAY;

    if (daysSince >= 7) {
      alerts.push({
        type: "inactive",
        severity: "medium",
        message: `Nessuna sessione completata da ${Math.round(daysSince)} giorni`,
        athleteId: input.athleteId,
        athleteName: input.athleteName,
      });
    }
  } else {
    alerts.push({
      type: "inactive",
      severity: "medium",
      message: "Nessuna sessione completata registrata",
      athleteId: input.athleteId,
      athleteName: input.athleteName,
    });
  }

  if (input.programExpiresAt !== null) {
    const daysLeft =
      (Date.parse(`${input.programExpiresAt}T00:00:00Z`) -
        Date.parse(`${input.today}T00:00:00Z`)) /
      MS_PER_DAY;

    if (daysLeft >= 0 && daysLeft <= 7) {
      alerts.push({
        type: "program_expiring",
        severity: "medium",
        message:
          daysLeft === 0
            ? "Programma in scadenza oggi"
            : `Programma in scadenza tra ${Math.round(daysLeft)} giorni`,
        athleteId: input.athleteId,
        athleteName: input.athleteName,
      });
    }
  }

  return alerts;
};

export const compareAlertSeverity = (a: CoachAlert, b: CoachAlert): number => {
  const rank = { high: 0, medium: 1 } as const;
  return rank[a.severity] - rank[b.severity];
};

export type LoggedSetWithExercise = LoggedSetRow & {
  sessionId: number;
  exerciseId: number;
  exerciseName: string;
};

export const groupLoggedSetsBySessionWithExercise = (
  sets: LoggedSetWithExercise[],
): SessionSetsWithExerciseGroup[] =>
  Object.entries(
    sets.reduce<Record<number, Array<LoggedSetRow & { exerciseId: number }>>>(
      (groups, set) => ({
        ...groups,
        [set.sessionId]: [
          ...(groups[set.sessionId] ?? []),
          {
            exerciseId: set.exerciseId,
            weightKg: set.weightKg,
            reps: set.reps,
          },
        ],
      }),
      {},
    ),
  ).map(([sessionId, sessionSets]) => ({
    sessionId: Number(sessionId),
    sets: sessionSets,
  }));

export const buildExerciseProgressionsFromLoggedSets = (
  sessions: CompletedSessionRow[],
  sets: LoggedSetWithExercise[],
  period: PeriodBounds,
): ExerciseProgression[] => {
  const setsBySession = groupLoggedSetsBySessionWithExercise(sets);
  const exerciseNames = new Map(
    sets.map((set) => [set.exerciseId, set.exerciseName] as const),
  );

  return buildExerciseProgressions(sessions, setsBySession, exerciseNames, period);
};

export const computeSessionDurationSummary = (
  sessions: CompletedSessionRow[],
  period: PeriodBounds,
): number => {
  const filtered = sessions.filter((session) =>
    isDateInRange(toRomeDateKey(session.completedAt), period),
  );

  if (filtered.length === 0) {
    return 0;
  }

  const total = filtered.reduce(
    (sum, session) =>
      sum + computeSessionDurationMin(session.startedAt, session.completedAt),
    0,
  );

  return Math.round(total / filtered.length);
};
