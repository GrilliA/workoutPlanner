import type { SessionHistoryResponse } from "@api";
import type { SessionHistoryItem } from "../types";

const formatSessionDate = (date: Date): string =>
  date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const mapSessionHistory = (
  response: SessionHistoryResponse,
): SessionHistoryItem[] =>
  response.items.map((session) => ({
    id: session.sessionId,
    name: session.workoutName,
    dateLabel: formatSessionDate(session.completedAt),
    durationMin: session.durationMin,
    volumeKg: session.volumeKg,
  }));
