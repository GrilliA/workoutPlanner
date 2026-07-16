import {
  computeSessionDurationMin,
  computeSessionVolumeKg,
  groupLoggedSetsBySession,
  type RecentSessionSummary,
} from "./stats";

export const DEFAULT_SESSION_HISTORY_PAGE = 1;
export const DEFAULT_SESSION_HISTORY_LIMIT = 10;
export const MAX_SESSION_HISTORY_LIMIT = 50;

export type SessionHistoryQuery = {
  page: number;
  limit: number;
};

export type SessionHistoryPage = {
  items: RecentSessionSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type CompletedSessionRow = {
  sessionId: number;
  workoutId: number;
  workoutName: string;
  startedAt: Date;
  completedAt: Date;
};

type LoggedSetRow = {
  sessionId: number;
  weightKg: number | null;
  reps: number;
};

export const parseSessionHistoryPage = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_SESSION_HISTORY_PAGE;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_SESSION_HISTORY_PAGE;
  }

  return parsed;
};

export const parseSessionHistoryLimit = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_SESSION_HISTORY_LIMIT;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_SESSION_HISTORY_LIMIT;
  }

  return Math.min(parsed, MAX_SESSION_HISTORY_LIMIT);
};

export const mapCompletedSessionsToHistoryItems = (
  sessions: CompletedSessionRow[],
  sets: LoggedSetRow[],
): RecentSessionSummary[] => {
  const setsBySession = groupLoggedSetsBySession(sets);

  return [...sessions]
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .map((session) => {
      const sessionSets =
        setsBySession.find((group) => group.sessionId === session.sessionId)?.sets ?? [];

      return {
        sessionId: session.sessionId,
        workoutId: session.workoutId,
        workoutName: session.workoutName,
        completedAt: session.completedAt,
        durationMin: computeSessionDurationMin(session.startedAt, session.completedAt),
        volumeKg: computeSessionVolumeKg(sessionSets),
      };
    });
};

export const buildSessionHistoryPage = (
  sessions: CompletedSessionRow[],
  sets: LoggedSetRow[],
  query: SessionHistoryQuery,
): SessionHistoryPage => {
  const sortedItems = mapCompletedSessionsToHistoryItems(sessions, sets);
  const total = sortedItems.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);
  const offset = (query.page - 1) * query.limit;
  const items = sortedItems.slice(offset, offset + query.limit);

  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
};
