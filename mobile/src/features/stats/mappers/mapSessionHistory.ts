import type { SessionHistoryResponse } from "../../../api";
import { formatKgValue } from "../../home/mappers/mapHomeStats";
import type { HistorySessionRow, HistoryViewModel } from "../types";

const formatSessionDate = (date: Date): string =>
  date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const mapSessionHistoryRows = (
  response: SessionHistoryResponse,
): HistorySessionRow[] =>
  response.items.map((session) => ({
    id: session.sessionId,
    title: session.workoutName,
    meta: `${formatSessionDate(session.completedAt)} · ${session.durationMin} min`,
    volumeLabel: `${formatKgValue(session.volumeKg)} kg`,
  }));

export const mapSessionHistory = (
  response: SessionHistoryResponse,
): HistoryViewModel => ({
  rows: mapSessionHistoryRows(response),
  page: response.page,
  totalPages: response.totalPages,
  total: response.total,
  canLoadMore: response.page < response.totalPages,
  emptyMessage: "Nessuna sessione completata nel tuo storico.",
});
